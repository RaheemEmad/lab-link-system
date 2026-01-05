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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DollarSign, Loader2, MessageSquare, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface BidRevisionDialogProps {
  requestId: string;
  orderId: string;
  orderNumber: string;
  originalBid: number;
  revisionNote: string | null;
  mode: 'request' | 'respond'; // Doctor requests revision OR Lab responds
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BidRevisionDialog = ({ 
  requestId, 
  orderId,
  orderNumber,
  originalBid, 
  revisionNote,
  mode,
  open, 
  onOpenChange 
}: BidRevisionDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>(originalBid.toString());
  const [note, setNote] = useState('');

  // Doctor requests revision
  const requestRevision = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error("Please provide a reason for revision request");

      const { error } = await supabase
        .from("lab_work_requests")
        .update({
          bid_status: 'revision_requested',
          revision_requested_at: new Date().toISOString(),
          revision_request_note: note.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);
      
      if (error) throw error;

      // Send notification to lab
      const { data: request } = await supabase
        .from("lab_work_requests")
        .select("requested_by_user_id")
        .eq("id", requestId)
        .single();

      if (request?.requested_by_user_id) {
        await supabase.from("notifications").insert({
          user_id: request.requested_by_user_id,
          order_id: orderId,
          type: 'bid_revision_requested',
          title: 'Revision Requested',
          message: `The doctor has requested a bid revision for order ${orderNumber}. Please review and submit a revised bid.`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor"] });
      toast.success("Revision requested", {
        description: "The lab will be notified to submit a revised bid."
      });
      onOpenChange(false);
      setNote('');
    },
    onError: (error: Error) => {
      toast.error("Failed to request revision", {
        description: error.message
      });
    },
  });

  // Lab submits revised bid
  const submitRevisedBid = useMutation({
    mutationFn: async () => {
      const revisedAmount = parseFloat(amount);
      if (!revisedAmount || revisedAmount <= 0) throw new Error("Please enter a valid amount");

      const { error } = await supabase
        .from("lab_work_requests")
        .update({
          bid_status: 'revised',
          revised_amount: revisedAmount,
          revised_at: new Date().toISOString(),
          bid_notes: note.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);
      
      if (error) throw error;

      // Notify doctor
      const { data: order } = await supabase
        .from("orders")
        .select("doctor_id")
        .eq("id", orderId)
        .single();

      if (order?.doctor_id) {
        await supabase.from("notifications").insert({
          user_id: order.doctor_id,
          order_id: orderId,
          type: 'bid_revised',
          title: 'Revised Bid Received',
          message: `A lab has submitted a revised bid of $${revisedAmount.toFixed(2)} for order ${orderNumber}.`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
      toast.success("Revised bid submitted", {
        description: "The doctor will review your updated bid."
      });
      onOpenChange(false);
      setAmount('');
      setNote('');
    },
    onError: (error: Error) => {
      toast.error("Failed to submit revised bid", {
        description: error.message
      });
    },
  });

  // Lab refuses after revision request
  const refuseOrder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lab_work_requests")
        .update({
          status: 'refused',
          bid_status: 'refused',
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      toast.info("Order declined");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to decline", {
        description: error.message
      });
    },
  });

  const isPending = requestRevision.isPending || submitRevisedBid.isPending || refuseOrder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'request' ? 'Request Bid Revision' : 'Submit Revised Bid'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'request' 
              ? 'Ask the lab to adjust their bid amount'
              : 'The doctor has requested a revision to your bid'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Bid Info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order</span>
              <span className="font-mono font-medium">{orderNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Original Bid</span>
              <span className="font-medium">${originalBid.toFixed(2)}</span>
            </div>
          </div>

          {/* Doctor's revision note (for lab) */}
          {mode === 'respond' && revisionNote && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Doctor's Message:</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{revisionNote}</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'request' ? (
            // Doctor requesting revision
            <div className="space-y-2">
              <Label htmlFor="revisionNote">Reason for Revision *</Label>
              <Textarea
                id="revisionNote"
                placeholder="Explain why you're requesting a different amount (e.g., budget constraints, market rates, complexity concerns)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none min-h-[100px]"
              />
            </div>
          ) : (
            // Lab responding with revised bid
            <>
              <div className="space-y-2">
                <Label htmlFor="revisedAmount">Revised Bid Amount *</Label>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    ${originalBid.toFixed(2)}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="revisedAmount"
                      type="number"
                      placeholder="New amount"
                      className="pl-9"
                      min={0}
                      step={0.01}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseNote">Response Note (Optional)</Label>
                <Textarea
                  id="responseNote"
                  placeholder="Explain your revised pricing..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none min-h-[80px]"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {mode === 'respond' && (
            <Button 
              variant="destructive" 
              onClick={() => refuseOrder.mutate()}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Decline Order
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => mode === 'request' ? requestRevision.mutate() : submitRevisedBid.mutate()}
            disabled={isPending || (mode === 'request' ? !note.trim() : !amount || parseFloat(amount) <= 0)}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : mode === 'request' ? (
              'Request Revision'
            ) : (
              'Submit Revised Bid'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BidRevisionDialog;
