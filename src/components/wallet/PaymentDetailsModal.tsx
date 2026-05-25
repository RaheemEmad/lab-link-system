import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, CreditCard, Smartphone, Hash, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

interface PaymentDetailsModalProps {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending review</Badge>;
  }
};

const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-2 border-b last:border-b-0">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  </div>
);

const PaymentDetailsModal = ({ paymentId, open, onOpenChange }: PaymentDetailsModalProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["payment-details", paymentId],
    enabled: !!paymentId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_confirmations")
        .select("*, subscription_plans(name, monthly_fee)")
        .eq("id", paymentId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>Full information about this payment submission.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground py-4">Payment not found.</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-2">
              {statusBadge(data.status)}
              <span className="text-lg font-bold text-primary">{data.amount} EGP</span>
            </div>
            <Row icon={CreditCard} label="Method" value={data.payment_method === "vodafone_cash" ? "Vodafone Cash" : "InstaPay"} />
            {data.phone_used && <Row icon={Smartphone} label="Phone used" value={data.phone_used} />}
            {data.reference_number && <Row icon={Hash} label="Reference" value={data.reference_number} />}
            {data.subscription_plans && (
              <Row icon={FileText} label="Plan" value={`${data.subscription_plans.name} (${data.subscription_plans.monthly_fee} EGP/mo)`} />
            )}
            <Row icon={Calendar} label="Submitted" value={format(new Date(data.created_at), "PPpp")} />
            {data.reviewed_at && <Row icon={Calendar} label="Reviewed" value={format(new Date(data.reviewed_at), "PPpp")} />}
            {data.notes && <Row icon={FileText} label="Your notes" value={data.notes} />}
            {data.rejection_reason && (
              <Row icon={XCircle} label="Rejection reason" value={<span className="text-destructive">{data.rejection_reason}</span>} />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsModal;
