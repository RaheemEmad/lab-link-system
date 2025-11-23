import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, MapPin, Phone, Clock, FileText, User, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface OrderShipment {
  id: string;
  order_number: string;
  patient_name: string;
  status: string;
  driver_name: string | null;
  driver_phone_whatsapp: string | null;
  pickup_time: string | null;
  tracking_location: string | null;
  shipment_notes: string | null;
  shipment_tracking: string | null;
  carrier_name: string | null;
  carrier_phone: string | null;
  expected_delivery_date: string | null;
  assigned_lab_id: string | null;
  labs: {
    name: string;
  } | null;
}

export default function TrackOrders() {
  const [orders, setOrders] = useState<OrderShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchOrders();
    setupRealtimeSubscription();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          patient_name,
          status,
          driver_name,
          driver_phone_whatsapp,
          pickup_time,
          tracking_location,
          shipment_notes,
          shipment_tracking,
          carrier_name,
          carrier_phone,
          expected_delivery_date,
          assigned_lab_id,
          labs:assigned_lab_id (
            name
          )
        `)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("track-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      "In Progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "Ready for QC": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "Ready for Delivery": "bg-orange-500/10 text-orange-500 border-orange-500/20",
      Delivered: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Track Your Orders</h1>
          <p className="text-muted-foreground mt-2">Monitor shipment status and delivery details</p>
        </div>
        <Button onClick={() => navigate("/new-order")}>
          <Package className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first order to start tracking shipments
            </p>
            <Button onClick={() => navigate("/new-order")}>Create Order</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Order #{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Patient: {order.patient_name}</p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Lab & Carrier Info */}
                  <div className="space-y-4">
                    {order.labs && (
                      <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Assigned Lab</p>
                          <p className="text-sm text-muted-foreground">{order.labs.name}</p>
                        </div>
                      </div>
                    )}

                    {order.carrier_name && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Carrier</p>
                          <p className="text-sm text-muted-foreground">{order.carrier_name}</p>
                          {order.carrier_phone && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => openWhatsApp(order.carrier_phone!)}
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              {order.carrier_phone}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {order.driver_name && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Driver</p>
                          <p className="text-sm text-muted-foreground">{order.driver_name}</p>
                          {order.driver_phone_whatsapp && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => openWhatsApp(order.driver_phone_whatsapp!)}
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              {order.driver_phone_whatsapp}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Shipment Details */}
                  <div className="space-y-4">
                    {order.pickup_time && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Pickup Time</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.pickup_time), "PPp")}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.expected_delivery_date && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Expected Delivery</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.expected_delivery_date), "PP")}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.tracking_location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Tracking Location</p>
                          <p className="text-sm text-muted-foreground">{order.tracking_location}</p>
                        </div>
                      </div>
                    )}

                    {order.shipment_tracking && (
                      <div className="flex items-start gap-3">
                        <ExternalLink className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Tracking Number</p>
                          <p className="text-sm text-muted-foreground font-mono">{order.shipment_tracking}</p>
                        </div>
                      </div>
                    )}

                    {order.shipment_notes && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Shipment Notes</p>
                          <p className="text-sm text-muted-foreground">{order.shipment_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!order.driver_name && !order.carrier_name && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      Shipment details will appear here once the lab processes your order
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
