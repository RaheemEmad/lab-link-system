import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, User, ArrowRight, Edit } from "lucide-react";
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

interface EditHistoryEntry {
  id: string;
  changed_at: string;
  changed_by: string;
  changer_name: string | null;
  changed_fields: Record<string, { old: any; new: any }>;
  change_summary: string | null;
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
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [orderId]);

  const fetchHistory = async () => {
    try {
      // Fetch status history
      const { data: statusData, error: statusError } = await supabase
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

      if (statusError) throw statusError;

      const formattedStatusData = statusData?.map((entry: any) => ({
        id: entry.id,
        old_status: entry.old_status,
        new_status: entry.new_status,
        changed_at: entry.changed_at,
        changed_by: entry.changed_by,
        changer_name: entry.profiles?.full_name || entry.profiles?.email || "Unknown User",
      })) || [];

      setStatusHistory(formattedStatusData);

      // Fetch edit history
      const { data: editData, error: editError } = await supabase
        .from("order_edit_history")
        .select(`
          id,
          changed_at,
          changed_by,
          changed_fields,
          change_summary,
          profiles:changed_by (
            full_name,
            email
          )
        `)
        .eq("order_id", orderId)
        .order("changed_at", { ascending: false });

      if (editError) throw editError;

      const formattedEditData = editData?.map((entry: any) => ({
        id: entry.id,
        changed_at: entry.changed_at,
        changed_by: entry.changed_by,
        changer_name: entry.profiles?.full_name || entry.profiles?.email || "Unknown User",
        changed_fields: entry.changed_fields,
        change_summary: entry.change_summary,
      })) || [];

      setEditHistory(formattedEditData);
    } catch (error: any) {
      console.error("Failed to fetch order history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonTimeline items={5} />;
  }

  const renderStatusTimeline = () => {
    if (statusHistory.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No status changes recorded yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {statusHistory.map((entry, index) => (
          <div key={entry.id} className="relative">
            {/* Timeline line */}
            {index !== statusHistory.length - 1 && (
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
    );
  };

  const renderEditTimeline = () => {
    if (editHistory.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No edits recorded yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {editHistory.map((entry, index) => (
          <div key={entry.id} className="relative">
            {/* Timeline line */}
            {index !== editHistory.length - 1 && (
              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
            )}

            <div className="flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-background">
                <Edit className="h-3 w-3 text-accent" />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2 pb-4">
                <div className="font-medium text-sm">
                  {entry.change_summary}
                </div>

                {/* Show changed fields */}
                <div className="space-y-2">
                  {Object.entries(entry.changed_fields).map(([field, values]) => (
                    <div key={field} className="text-sm bg-muted/50 p-2 rounded">
                      <div className="font-medium mb-1">{field}:</div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="line-through">{String(values.old)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-foreground font-medium">{String(values.new)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-2">
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
    );
  };

  if (statusHistory.length === 0 && editHistory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No history recorded yet.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order History - {orderNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status Changes</TabsTrigger>
            <TabsTrigger value="edits">Field Edits</TabsTrigger>
          </TabsList>
          <TabsContent value="status" className="mt-4">
            {renderStatusTimeline()}
          </TabsContent>
          <TabsContent value="edits" className="mt-4">
            {renderEditTimeline()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
