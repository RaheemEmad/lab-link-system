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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onSuccess: () => void;
}

const DisputeDialog = ({ open, onOpenChange, invoiceId, onSuccess }: DisputeDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (reason.length < 20) throw new Error('Please provide a detailed reason (min 20 characters)');

      const { error } = await supabase.rpc('raise_invoice_dispute', {
        p_invoice_id: invoiceId,
        p_user_id: user.id,
        p_reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Dispute raised successfully', {
        description: 'The invoice has been frozen and an admin will review it.',
      });
      setReason('');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error('Failed to raise dispute', { description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Dispute Invoice
          </DialogTitle>
          <DialogDescription>
            Raising a dispute will freeze this invoice until resolved by an admin. 
            Please provide a detailed explanation of the issue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> Once disputed, the invoice cannot be modified until an admin resolves the dispute. 
              This action is logged and will be visible to all parties.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Dispute Reason</Label>
            <Textarea
              id="reason"
              placeholder="Explain in detail why you are disputing this invoice (e.g., incorrect charges, missing credits, billing errors)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/20 characters minimum
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => disputeMutation.mutate()}
            disabled={disputeMutation.isPending || reason.length < 20}
          >
            {disputeMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Raise Dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeDialog;