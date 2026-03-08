import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatEGP } from "@/lib/formatters";
import { createNotification } from "@/lib/notifications";

interface CreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  maxAmount: number;
}

const CreditNoteDialog = ({ open, onOpenChange, invoiceId, invoiceNumber, maxAmount }: CreditNoteDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) throw new Error("Amount must be greater than 0");
      if (numAmount > maxAmount) throw new Error(`Amount cannot exceed ${formatEGP(maxAmount)}`);
      if (!reason.trim()) throw new Error("Reason is required");

      const { error } = await supabase.from("credit_notes").insert({
        invoice_id: invoiceId,
        amount: numAmount,
        reason: reason.trim(),
        issued_by: user?.id!,
      });
      if (error) throw error;

      // Audit log
      await supabase.from("billing_audit_log").insert({
        invoice_id: invoiceId,
        action: "credit_note_issued",
        performed_by: user?.id,
        reason: `Credit note: ${formatEGP(numAmount)} - ${reason.trim()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["credit-notes"] });
      toast.success("Credit note issued");
      setAmount("");
      setReason("");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to issue credit note", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Credit Note</DialogTitle>
          <DialogDescription>
            Issue a credit against invoice {invoiceNumber}. Max: {formatEGP(maxAmount)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="credit-amount">Amount (EGP)</Label>
            <Input
              id="credit-amount"
              type="number"
              step="0.01"
              min="0"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credit-reason">Reason</Label>
            <Textarea
              id="credit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Defective work, redo required..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue Credit Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreditNoteDialog;
