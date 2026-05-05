import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Receipt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending review
        </Badge>
      );
  }
};

export const PaymentConfirmationStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-confirmations", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_confirmations")
        .select("id, amount, payment_method, status, reference_number, rejection_reason, created_at, reviewed_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Real-time updates so users see admin verification instantly
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`payment-confirmations-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_confirmations",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row?.status === "approved") {
            toast.success("Payment approved", {
              description: `${row.amount} EGP confirmed by our team.`,
            });
          } else if (row?.status === "rejected") {
            toast.error("Payment rejected", {
              description: row.rejection_reason || "Contact support for details.",
            });
          }
          queryClient.invalidateQueries({ queryKey: ["payment-confirmations", user.id] });
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["doctor-subscription"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  if (isLoading || !data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Your Payment Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((p: any) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {statusBadge(p.status)}
                <span className="font-semibold">{p.amount} EGP</span>
                <span className="text-muted-foreground text-xs">
                  {p.payment_method === "vodafone_cash" ? "Vodafone Cash" : "InstaPay"}
                </span>
              </div>
              {p.reference_number && (
                <p className="text-xs text-muted-foreground truncate">Ref: {p.reference_number}</p>
              )}
              {p.rejection_reason && (
                <p className="text-xs text-destructive truncate">Reason: {p.rejection_reason}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Submitted {format(new Date(p.created_at), "PP p")}
                {p.reviewed_at && ` · Reviewed ${format(new Date(p.reviewed_at), "PP p")}`}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
