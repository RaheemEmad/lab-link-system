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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, XCircle, Banknote } from "lucide-react";

interface DisputeResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  disputeReason?: string | null;
  onSuccess?: () => void;
}

type ResolutionAction = 'accepted' | 'rejected' | 'adjusted';

const DisputeResolutionDialog = ({
  open,
  onOpenChange,
  invoiceId,
  disputeReason,
  onSuccess,
}: DisputeResolutionDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction>('rejected');
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("");

  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolutionNotes.trim()) {
        throw new Error("Resolution notes are required");
      }

      const { error } = await supabase.rpc('resolve_invoice_dispute', {
        p_invoice_id: invoiceId,
        p_user_id: user?.id,
        p_resolution_action: resolutionAction,
        p_resolution_notes: resolutionNotes,
        p_adjustment_amount: resolutionAction === 'adjusted' && adjustmentAmount 
          ? parseFloat(adjustmentAmount) 
          : null
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Dispute resolved successfully');
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error('Failed to resolve dispute', { description: error.message });
    }
  });

  const resetForm = () => {
    setResolutionAction('rejected');
    setResolutionNotes("");
    setAdjustmentAmount("");
  };

  const handleResolve = () => {
    resolveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Resolve Invoice Dispute
          </DialogTitle>
          <DialogDescription>
            Review the dispute and choose a resolution action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dispute Reason */}
          {disputeReason && (
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium text-destructive mb-1">Dispute Reason:</p>
              <p className="text-sm">{disputeReason}</p>
            </div>
          )}

          {/* Resolution Action */}
          <div className="space-y-2">
            <Label>Resolution Action</Label>
            <RadioGroup
              value={resolutionAction}
              onValueChange={(v) => setResolutionAction(v as ResolutionAction)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="rejected" id="rejected" />
                <Label htmlFor="rejected" className="flex items-center gap-2 cursor-pointer flex-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="font-medium">Reject Dispute</p>
                    <p className="text-xs text-muted-foreground">Dismiss the dispute, no changes to invoice</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="accepted" id="accepted" />
                <Label htmlFor="accepted" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">Accept Dispute</p>
                    <p className="text-xs text-muted-foreground">Agree with the dispute, revert invoice status</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="adjusted" id="adjusted" />
                <Label htmlFor="adjusted" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="font-medium">Adjust Amount</p>
                    <p className="text-xs text-muted-foreground">Partially agree, apply credit/debit adjustment</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Adjustment Amount (only if adjusted) */}
          {resolutionAction === 'adjusted' && (
            <div className="space-y-2">
              <Label htmlFor="adjustmentAmount">Adjustment Amount (EGP)</Label>
              <Input
                id="adjustmentAmount"
                type="number"
                step="0.01"
                placeholder="e.g., -50 for credit, 50 for additional charge"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use negative value for credit (reduces amount due), positive for additional charge
              </p>
            </div>
          )}

          {/* Resolution Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Resolution Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Explain the resolution decision..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Required. This will be visible in the audit trail.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={resolveMutation.isPending || !resolutionNotes.trim()}
          >
            {resolveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resolving...
              </>
            ) : (
              'Resolve Dispute'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeResolutionDialog;
