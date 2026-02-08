import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InvoiceRequestButtonProps {
  orderId: string;
  orderNumber: string;
  className?: string;
}

const InvoiceRequestButton = ({ orderId, orderNumber, className }: InvoiceRequestButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Check if invoice already exists for this order
  const { data: existingInvoice } = useQuery({
    queryKey: ['invoice-for-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status')
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Check if request already exists
  const { data: existingRequest } = useQuery({
    queryKey: ['invoice-request', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_requests')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('invoice_requests')
        .insert({
          order_id: orderId,
          requested_by: user?.id,
          notes: notes.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-request', orderId] });
      toast.success('Invoice request submitted', {
        description: 'The lab will be notified to generate your invoice.'
      });
      setOpen(false);
      setNotes("");
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request', { description: error.message });
    }
  });

  // If invoice already exists, show view link
  if (existingInvoice) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CheckCircle2 className="h-3 w-3 text-green-600" />
        Invoice: {existingInvoice.invoice_number}
      </Badge>
    );
  }

  // If request is pending
  if (existingRequest) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Clock className="h-3 w-3" />
        Invoice Requested
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <FileText className="h-4 w-4 mr-2" />
          Request Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Invoice</DialogTitle>
          <DialogDescription>
            Request the lab to generate an invoice for order {orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Once you submit this request, the lab will be notified and will generate 
              an invoice for this order. You'll receive a notification when it's ready.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific details or questions about the invoice..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending}
          >
            {requestMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceRequestButton;
