import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const PaymentConfirmationsTab = () => {
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<{ id: string; open: boolean }>({ id: "", open: false });
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: confirmations, isLoading } = useQuery({
    queryKey: ["admin-payment-confirmations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_confirmations")
        .select("*, subscription_plans(name, monthly_fee)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, userId, planId }: { id: string; userId: string; planId: string | null }) => {
      // Update confirmation status
      const { error } = await supabase
        .from("payment_confirmations")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // If plan_id is set, update or create subscription
      if (planId) {
        const { data: existing } = await supabase
          .from("doctor_subscriptions")
          .select("id")
          .eq("doctor_id", userId)
          .eq("status", "active")
          .maybeSingle();

        if (existing) {
          await supabase
            .from("doctor_subscriptions")
            .update({
              plan_id: planId,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("doctor_subscriptions")
            .insert({
              doctor_id: userId,
              plan_id: planId,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-payments"] });
      toast.success("Payment approved and subscription updated!");
    },
    onError: () => toast.error("Failed to approve payment"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("payment_confirmations")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-payments"] });
      setRejectDialog({ id: "", open: false });
      setRejectionReason("");
      toast.success("Payment rejected");
    },
    onError: () => toast.error("Failed to reject payment"),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Payment Confirmations</h2>
        <Badge variant="outline">{confirmations?.filter(c => c.status === "pending").length || 0} pending</Badge>
      </div>

      {(!confirmations || confirmations.length === 0) ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No payment confirmations yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {confirmations.map((conf: any) => (
            <Card key={conf.id} className={conf.status === "pending" ? "border-primary/30" : ""}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {statusBadge(conf.status)}
                      <span className="text-sm font-medium">{conf.payment_method === "vodafone_cash" ? "Vodafone Cash" : "InstaPay"}</span>
                      <span className="text-sm font-bold text-primary">{conf.amount} EGP</span>
                    </div>
                    {conf.subscription_plans && (
                      <p className="text-xs text-muted-foreground">Plan: {(conf as any).subscription_plans?.name} ({(conf as any).subscription_plans?.monthly_fee} EGP/mo)</p>
                    )}
                    {conf.reference_number && <p className="text-xs text-muted-foreground">Ref: {conf.reference_number}</p>}
                    {conf.phone_used && <p className="text-xs text-muted-foreground">Phone: {conf.phone_used}</p>}
                    {conf.notes && <p className="text-xs text-muted-foreground">Notes: {conf.notes}</p>}
                    {conf.rejection_reason && <p className="text-xs text-destructive">Reason: {conf.rejection_reason}</p>}
                    <p className="text-xs text-muted-foreground">{format(new Date(conf.created_at), "PPp")}</p>
                  </div>
                  {conf.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate({ id: conf.id, userId: conf.user_id, planId: conf.plan_id })}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectDialog({ id: conf.id, open: true })}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g. Payment not received, incorrect amount..." />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog({ id: "", open: false })}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectDialog.id })} disabled={rejectMutation.isPending}>
              Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
