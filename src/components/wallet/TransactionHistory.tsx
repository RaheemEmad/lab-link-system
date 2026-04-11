import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle, ShoppingCart, RotateCcw, Lock } from "lucide-react";
import { format } from "date-fns";

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  deposit: { icon: ArrowDownCircle, label: "Deposit", color: "text-green-600" },
  withdrawal: { icon: ArrowUpCircle, label: "Withdrawal", color: "text-orange-600" },
  order_fee: { icon: ShoppingCart, label: "Order Fee", color: "text-destructive" },
  refund: { icon: RotateCcw, label: "Refund", color: "text-primary" },
  hold: { icon: Lock, label: "Hold", color: "text-muted-foreground" },
};

interface Props {
  walletId: string;
}

export const TransactionHistory = ({ walletId }: Props) => {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["wallet-transactions", walletId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!walletId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !transactions?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions yet. Make your first deposit to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const config = typeConfig[tx.type] || typeConfig.deposit;
              const Icon = config.icon;
              const isCredit = tx.type === "deposit" || tx.type === "refund";

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-muted ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description || config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${isCredit ? "text-green-600" : "text-destructive"}`}>
                    {isCredit ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()} EGP
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
