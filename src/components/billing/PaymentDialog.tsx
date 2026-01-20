import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, AlertTriangle } from "lucide-react";
import { format, isPast, startOfDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  currentStatus: PaymentStatus | null;
  currentAmountPaid: number;
  currentDueDate: string | null;
  currentPaymentReceivedAt: string | null;
  finalTotal: number;
}

// Helper function to format EGP currency
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

const PaymentDialog = ({
  open,
  onOpenChange,
  invoiceId,
  currentStatus,
  currentAmountPaid,
  currentDueDate,
  currentPaymentReceivedAt,
  finalTotal,
}: PaymentDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(currentStatus || 'pending');
  const [amountPaid, setAmountPaid] = useState(currentAmountPaid?.toString() || '0');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    currentDueDate ? new Date(currentDueDate) : undefined
  );
  const [paymentReceivedAt, setPaymentReceivedAt] = useState<Date | undefined>(
    currentPaymentReceivedAt ? new Date(currentPaymentReceivedAt) : undefined
  );

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPaymentStatus(currentStatus || 'pending');
      setAmountPaid(currentAmountPaid?.toString() || '0');
      setDueDate(currentDueDate ? new Date(currentDueDate) : undefined);
      setPaymentReceivedAt(currentPaymentReceivedAt ? new Date(currentPaymentReceivedAt) : undefined);
    }
  }, [open, currentStatus, currentAmountPaid, currentDueDate, currentPaymentReceivedAt]);

  // Auto-calculate status based on amount
  const handleAmountChange = (value: string) => {
    setAmountPaid(value);
    const numAmount = parseFloat(value) || 0;
    
    if (numAmount >= finalTotal) {
      setPaymentStatus('paid');
      if (!paymentReceivedAt) {
        setPaymentReceivedAt(new Date());
      }
    } else if (numAmount > 0) {
      setPaymentStatus('partial');
    } else if (dueDate && isPast(startOfDay(dueDate))) {
      setPaymentStatus('overdue');
    } else {
      setPaymentStatus('pending');
    }
  };

  // Check for overdue when due date changes
  const handleDueDateChange = (date: Date | undefined) => {
    setDueDate(date);
    const numAmount = parseFloat(amountPaid) || 0;
    
    if (numAmount >= finalTotal) {
      setPaymentStatus('paid');
    } else if (numAmount > 0) {
      setPaymentStatus('partial');
    } else if (date && isPast(startOfDay(date))) {
      setPaymentStatus('overdue');
    } else {
      setPaymentStatus('pending');
    }
  };

  const updatePaymentMutation = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amountPaid) || 0;
      
      // Validate amount doesn't exceed total
      if (numAmount > finalTotal) {
        throw new Error(`Amount paid cannot exceed invoice total (${formatEGP(finalTotal)})`);
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          payment_status: paymentStatus,
          amount_paid: numAmount,
          due_date: dueDate ? dueDate.toISOString() : null,
          payment_received_at: paymentReceivedAt ? paymentReceivedAt.toISOString() : null,
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Log to audit trail
      await supabase.from('billing_audit_log').insert({
        invoice_id: invoiceId,
        action: 'payment_updated',
        performed_by: user?.id,
        reason: `Payment status: ${paymentStatus}, Amount: ${formatEGP(numAmount)}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment information updated');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update payment', { description: error.message });
    },
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Partial</Badge>;
      case 'paid':
        return <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
    }
  };

  const remaining = finalTotal - (parseFloat(amountPaid) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
          <DialogDescription>
            Track payment for this invoice. Total due: {formatEGP(finalTotal)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Status */}
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <RadioGroup
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
              className="flex flex-wrap gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending" className="cursor-pointer">Pending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="cursor-pointer">Partial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" />
                <Label htmlFor="paid" className="cursor-pointer">Paid</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="overdue" id="overdue" />
                <Label htmlFor="overdue" className="cursor-pointer">Overdue</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Paid */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Paid (EGP)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={finalTotal}
              value={amountPaid}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Remaining:</span>
              <span className={cn(
                "font-medium",
                remaining > 0 ? "text-amber-600" : "text-green-600"
              )}>
                {formatEGP(Math.max(0, remaining))}
              </span>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDueDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dueDate && isPast(startOfDay(dueDate)) && paymentStatus !== 'paid' && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertTriangle className="h-3 w-3" />
                This invoice is past due
              </div>
            )}
          </div>

          {/* Payment Received Date */}
          <div className="space-y-2">
            <Label>Payment Received Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentReceivedAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentReceivedAt ? format(paymentReceivedAt, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentReceivedAt}
                  onSelect={setPaymentReceivedAt}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Current Status Preview */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Status will be:</span>
            {getStatusBadge(paymentStatus)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => updatePaymentMutation.mutate()}
            disabled={updatePaymentMutation.isPending}
          >
            {updatePaymentMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Update Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
