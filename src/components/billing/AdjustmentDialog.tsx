import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

const AdjustmentDialog = ({ open, onOpenChange, invoiceId }: AdjustmentDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adjustmentType, setAdjustmentType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [sourceEvent, setSourceEvent] = useState<string>('');

  const addAdjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!adjustmentType) throw new Error('Select adjustment type');
      if (!amount || isNaN(parseFloat(amount))) throw new Error('Enter valid amount');
      if (reason.length < 10) throw new Error('Reason must be at least 10 characters');

      const numAmount = parseFloat(amount);

      // Insert adjustment
      const { error: adjError } = await supabase
        .from('invoice_adjustments')
        .insert({
          invoice_id: invoiceId,
          adjustment_type: adjustmentType,
          amount: numAmount,
          reason: reason,
          approved_by: user.id,
          source_event: sourceEvent || null,
        });

      if (adjError) throw adjError;

      // Update invoice totals
      const { data: adjustments, error: fetchError } = await supabase
        .from('invoice_adjustments')
        .select('amount')
        .eq('invoice_id', invoiceId);

      if (fetchError) throw fetchError;

      const totalAdjustments = (adjustments || []).reduce((sum, adj) => sum + adj.amount, 0);

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          adjustments_total: totalAdjustments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      // Recalculate final total
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('subtotal, expenses_total')
        .eq('id', invoiceId)
        .single();

      if (invError) throw invError;

      await supabase
        .from('invoices')
        .update({
          final_total: invoice.subtotal + totalAdjustments - invoice.expenses_total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      // Add audit log
      await supabase.from('billing_audit_log').insert({
        invoice_id: invoiceId,
        action: 'adjusted',
        performed_by: user.id,
        new_values: { adjustment_type: adjustmentType, amount: numAmount, reason },
        reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-adjustments', invoiceId] });
      toast.success('Adjustment added successfully');
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to add adjustment', { description: error.message });
    },
  });

  const resetForm = () => {
    setAdjustmentType('');
    setAmount('');
    setReason('');
    setSourceEvent('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Adjustment</DialogTitle>
          <DialogDescription>
            Adjustments require a reason and are fully audited. This cannot be undone after invoice is finalized.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              All adjustments are logged with your user ID and require a detailed reason for audit compliance.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use negative for deductions (e.g., -50 for a $50 discount)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Required)</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this adjustment is being made (min 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/10 characters minimum
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source Event (Optional)</Label>
            <Select value={sourceEvent} onValueChange={setSourceEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Link to event..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_override">Admin Override</SelectItem>
                <SelectItem value="feedback_approved">Feedback Approved</SelectItem>
                <SelectItem value="rework_detected">Rework Detected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addAdjustmentMutation.mutate()}
            disabled={addAdjustmentMutation.isPending || !adjustmentType || !amount || reason.length < 10}
          >
            {addAdjustmentMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Add Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdjustmentDialog;