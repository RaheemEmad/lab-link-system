import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatEGP } from "@/lib/formatters";
import { createNotification } from "@/lib/notifications";

interface Invoice {
  id: string;
  invoice_number: string;
  final_total: number;
  amount_paid: number;
  payment_status: string | null;
  order?: { patient_name?: string } | null;
}

interface BulkPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
}

const BulkPaymentDialog = ({ open, onOpenChange, invoices }: BulkPaymentDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalReceived, setTotalReceived] = useState("");

  // Only show unpaid/partial invoices
  const eligibleInvoices = useMemo(
    () => invoices.filter(inv => inv.payment_status !== "paid" && inv.final_total > (inv.amount_paid || 0)),
    [invoices]
  );

  const selectedInvoices = eligibleInvoices.filter(inv => selectedIds.has(inv.id));
  const totalOutstanding = selectedInvoices.reduce((sum, inv) => sum + (inv.final_total - (inv.amount_paid || 0)), 0);

  const toggleInvoice = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === eligibleInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleInvoices.map(i => i.id)));
    }
  };

  const bulkPayMutation = useMutation({
    mutationFn: async () => {
      const received = parseFloat(totalReceived);
      if (!received || received <= 0) throw new Error("Enter a valid amount");
      if (selectedInvoices.length === 0) throw new Error("Select at least one invoice");

      // Allocate oldest first
      let remaining = received;
      const sorted = [...selectedInvoices].sort((a, b) =>
        new Date(a.id).getTime() - new Date(b.id).getTime()
      );

      for (const inv of sorted) {
        if (remaining <= 0) break;
        const outstanding = inv.final_total - (inv.amount_paid || 0);
        const allocated = Math.min(remaining, outstanding);
        const newPaid = (inv.amount_paid || 0) + allocated;
        const newStatus = newPaid >= inv.final_total ? "paid" : "partial";

        const { error } = await supabase
          .from("invoices")
          .update({
            amount_paid: newPaid,
            payment_status: newStatus,
            payment_received_at: newStatus === "paid" ? new Date().toISOString() : null,
          })
          .eq("id", inv.id);
        if (error) throw error;

        await supabase.from("billing_audit_log").insert({
          invoice_id: inv.id,
          action: "bulk_payment_applied",
          performed_by: user?.id,
          reason: `Bulk payment: ${formatEGP(allocated)} allocated (${newStatus})`,
        });

        remaining -= allocated;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Bulk payment recorded");
      setSelectedIds(new Set());
      setTotalReceived("");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to record payment", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Record Bulk Payment
          </DialogTitle>
          <DialogDescription>
            Select invoices and enter total amount received. Payment is allocated oldest-first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Total Amount Received (EGP)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={totalReceived}
              onChange={(e) => setTotalReceived(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Invoices</Label>
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                {selectedIds.size === eligibleInvoices.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
              {eligibleInvoices.map(inv => {
                const outstanding = inv.final_total - (inv.amount_paid || 0);
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                    <Checkbox
                      checked={selectedIds.has(inv.id)}
                      onCheckedChange={() => toggleInvoice(inv.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.order?.patient_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatEGP(outstanding)}</p>
                      <Badge variant="secondary" className="text-xs">due</Badge>
                    </div>
                  </div>
                );
              })}
              {eligibleInvoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No unpaid invoices</p>
              )}
            </div>
          </div>

          {selectedInvoices.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selected</span>
                <span>{selectedInvoices.length} invoices</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Outstanding</span>
                <span className="font-semibold">{formatEGP(totalOutstanding)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => bulkPayMutation.mutate()}
            disabled={bulkPayMutation.isPending || selectedInvoices.length === 0 || !totalReceived}
          >
            {bulkPayMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPaymentDialog;
