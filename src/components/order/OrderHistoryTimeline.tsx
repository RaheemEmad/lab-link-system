import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, ArrowRight } from "lucide-react";
import { SkeletonTimeline } from "@/components/ui/skeleton-card";

type OrderStatus = "Pending" | "In Progress" | "Ready for QC" | "Ready for Delivery" | "Delivered";

interface StatusHistoryEntry {
  id: string;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_at: string;
  changed_by: string;
  changer_name: string | null;
}

interface OrderHistoryTimelineProps {
  orderId: string;
  orderNumber: string;
}

const statusColors: Record<OrderStatus, string> = {
  "Pending": "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  "Ready for QC": "bg-accent/10 text-accent border-accent/20",
  "Ready for Delivery": "bg-primary/10 text-primary border-primary/20",
  "Delivered": "bg-success/10 text-success border-success/20",
};

export const OrderHistoryTimeline = ({ orderId, orderNumber }: OrderHistoryTimelineProps) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [orderId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("order_status_history")
        .select(`
          id,
          old_status,
          new_status,
          changed_at,
          changed_by,
          profiles:changed_by (
            full_name,
            email
          )
        `)
        .eq("order_id", orderId)
        .order("changed_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((entry: any) => ({
        id: entry.id,
        old_status: entry.old_status,
        new_status: entry.new_status,
        changed_at: entry.changed_at,
        changed_by: entry.changed_by,
        changer_name: entry.profiles?.full_name || entry.profiles?.email || "Unknown User",
      })) || [];

      setHistory(formattedData);
    } catch (error: any) {
      console.error("Failed to fetch order history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonTimeline items={5} />;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No status changes recorded yet.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order History - {orderNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry.id} className="relative">
              {/* Timeline line */}
              {index !== history.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
              )}

              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <Clock className="h-3 w-3 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.old_status && (
                      <Badge variant="outline" className={statusColors[entry.old_status]}>
                        {entry.old_status}
                      </Badge>
                    )}
                    {entry.old_status && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    <Badge variant="outline" className={statusColors[entry.new_status]}>
                      {entry.new_status}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{entry.changer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(entry.changed_at), "PPp")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
