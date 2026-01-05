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
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  restoration_type: string;
  urgency: string;
  target_budget: number | null;
  teeth_number: string;
}

interface BidSubmissionDialogProps {
  order: Order;
  labId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BidSubmissionDialog = ({ order, labId, open, onOpenChange }: BidSubmissionDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState<string>(order.target_budget?.toString() || '');
  const [bidNotes, setBidNotes] = useState('');

  const submitBid = useMutation({
    mutationFn: async () => {
      if (!user?.id || !labId) throw new Error("Not authenticated");
      if (!bidAmount || parseFloat(bidAmount) <= 0) throw new Error("Please enter a valid bid amount");

      const { error } = await supabase
        .from("lab_work_requests")
        .insert({
          order_id: order.id,
          lab_id: labId,
          requested_by_user_id: user.id,
          status: 'pending',
          bid_amount: parseFloat(bidAmount),
          bid_notes: bidNotes || null,
          bid_status: 'pending'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests", labId] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      toast.success("Bid submitted successfully", {
        description: "The doctor will review your bid and respond."
      });
      onOpenChange(false);
      setBidAmount('');
      setBidNotes('');
    },
    onError: (error: Error) => {
      toast.error("Failed to submit bid", {
        description: error.message
      });
    },
  });

  const getBidComparison = () => {
    if (!order.target_budget || !bidAmount) return null;
    const bid = parseFloat(bidAmount);
    const budget = order.target_budget;
    const diff = ((bid - budget) / budget) * 100;
    
    if (diff > 5) {
      return { icon: TrendingUp, text: `${diff.toFixed(0)}% above budget`, color: 'text-orange-500' };
    } else if (diff < -5) {
      return { icon: TrendingDown, text: `${Math.abs(diff).toFixed(0)}% below budget`, color: 'text-green-500' };
    }
    return { icon: Minus, text: 'Within budget range', color: 'text-blue-500' };
  };

  const comparison = getBidComparison();

  // Count teeth for estimation
  const teethCount = order.teeth_number?.split(',').filter(t => t.trim()).length || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Your Bid</DialogTitle>
          <DialogDescription>
            Review the order details and submit your competitive bid
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order</span>
              <span className="font-mono font-medium">{order.order_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="font-medium">{order.restoration_type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Units</span>
              <span className="font-medium">{teethCount} teeth</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Urgency</span>
              <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>
                {order.urgency}
              </Badge>
            </div>
            {order.target_budget && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Doctor's Budget</span>
                <span className="font-bold text-primary">${order.target_budget.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Bid Amount */}
          <div className="space-y-2">
            <Label htmlFor="bidAmount">Your Bid Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="bidAmount"
                type="number"
                placeholder="Enter your bid"
                className="pl-9"
                min={0}
                step={0.01}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
            </div>
            {comparison && (
              <div className={`flex items-center gap-1 text-sm ${comparison.color}`}>
                <comparison.icon className="h-4 w-4" />
                <span>{comparison.text}</span>
              </div>
            )}
          </div>

          {/* Bid Notes */}
          <div className="space-y-2">
            <Label htmlFor="bidNotes">Notes (Optional)</Label>
            <Textarea
              id="bidNotes"
              placeholder="Explain your pricing, turnaround time, or any special considerations..."
              value={bidNotes}
              onChange={(e) => setBidNotes(e.target.value)}
              className="resize-none min-h-[80px]"
            />
          </div>

          {/* Warning */}
          {!order.target_budget && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/20">
              <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                No budget specified by doctor. Submit a competitive bid based on your assessment.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => submitBid.mutate()}
            disabled={submitBid.isPending || !bidAmount || parseFloat(bidAmount) <= 0}
          >
            {submitBid.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Bid'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BidSubmissionDialog;
