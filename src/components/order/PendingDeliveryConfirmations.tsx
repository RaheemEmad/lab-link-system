import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { DeliveryConfirmationDialog } from "./DeliveryConfirmationDialog";

interface PendingOrder {
  id: string;
  order_number: string;
  patient_name: string;
  restoration_type: string;
  urgency: string;
  labs: {
    name: string;
  } | null;
}

export const PendingDeliveryConfirmations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: pendingOrders, isLoading } = useQuery({
    queryKey: ["pending-delivery-confirmations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          patient_name,
          restoration_type,
          urgency,
          labs (
            name
          )
        `)
        .eq("doctor_id", user.id)
        .eq("delivery_pending_confirmation", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as PendingOrder[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const handleConfirmed = () => {
    queryClient.invalidateQueries({ queryKey: ["pending-delivery-confirmations"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  if (isLoading) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingOrders || pendingOrders.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-500/50 bg-amber-500/5 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-amber-500" />
            Awaiting Your Confirmation
            <Badge variant="secondary" className="ml-2">
              {pendingOrders.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            These orders have been marked as delivered by the lab. Please confirm receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">
                        {order.order_number}
                      </span>
                      {order.urgency === "Urgent" && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.patient_name} • {order.restoration_type}
                      {order.labs?.name && ` • ${order.labs.name}`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedOrder(order);
                    setDialogOpen(true);
                  }}
                  className="flex-shrink-0"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedOrder && (
        <DeliveryConfirmationDialog
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          patientName={selectedOrder.patient_name}
          labName={selectedOrder.labs?.name}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirmed={handleConfirmed}
        />
      )}
    </>
  );
};
