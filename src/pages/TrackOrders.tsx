import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, Truck, MapPin, Clock, Phone, User, AlertTriangle, Calendar, ArrowLeft, FileText, ExternalLink, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
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
  doctor_id: string | null;
  labs: {
    name: string;
  } | null;
}

const TrackOrders = () => {
  const { user } = useAuth();
  const { role, labId, isLabStaff, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderShipment[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    carrier_name: "",
    carrier_phone: "",
    shipment_tracking: "",
    expected_delivery_date: "",
    pickup_time: "",
    tracking_location: "",
    driver_name: "",
    driver_phone_whatsapp: "",
    shipment_notes: "",
  });

  useEffect(() => {
    // Wait for both user auth AND role to be loaded
    if (!user || roleLoading) return;
    
    fetchOrders();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [user, roleLoading, isLabStaff, labId]);

  const fetchOrders = async () => {
    if (!user || roleLoading) return;

    try {
      setLoading(true);
      
      if (isLabStaff) {
        // Query via order_assignments for lab staff (matches RLS policy)
        const { data: assignments, error: assignmentError } = await supabase
          .from("order_assignments")
          .select("order_id")
          .eq("user_id", user.id);
        
        if (assignmentError) throw assignmentError;
        
        if (!assignments || assignments.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }
        
        const orderIds = assignments.map(a => a.order_id);
        
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
            doctor_id,
            labs:assigned_lab_id (
              name
            )
          `)
          .in("id", orderIds)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        setOrders(data || []);
      } else {
        // Doctor query
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
            doctor_id,
            labs:assigned_lab_id (
              name
            )
          `)
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        setOrders(data || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
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

    // Also subscribe to order_assignments changes for lab staff
    if (isLabStaff && user) {
      const assignmentChannel = supabase
        .channel("order-assignments-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public", 
            table: "order_assignments",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(assignmentChannel);
      };
    }

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

  const startEditing = (order: OrderShipment) => {
    setEditingOrderId(order.id);
    setEditForm({
      carrier_name: order.carrier_name || "",
      carrier_phone: order.carrier_phone || "",
      shipment_tracking: order.shipment_tracking || "",
      expected_delivery_date: order.expected_delivery_date || "",
      pickup_time: order.pickup_time || "",
      tracking_location: order.tracking_location || "",
      driver_name: order.driver_name || "",
      driver_phone_whatsapp: order.driver_phone_whatsapp || "",
      shipment_notes: order.shipment_notes || "",
    });
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setEditForm({
      carrier_name: "",
      carrier_phone: "",
      shipment_tracking: "",
      expected_delivery_date: "",
      pickup_time: "",
      tracking_location: "",
      driver_name: "",
      driver_phone_whatsapp: "",
      shipment_notes: "",
    });
  };

  const saveShipmentDetails = async (orderId: string, doctorId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          carrier_name: editForm.carrier_name || null,
          carrier_phone: editForm.carrier_phone || null,
          shipment_tracking: editForm.shipment_tracking || null,
          expected_delivery_date: editForm.expected_delivery_date || null,
          pickup_time: editForm.pickup_time || null,
          tracking_location: editForm.tracking_location || null,
          driver_name: editForm.driver_name || null,
          driver_phone_whatsapp: editForm.driver_phone_whatsapp || null,
          shipment_notes: editForm.shipment_notes || null,
        })
        .eq("id", orderId);

      if (error) throw error;

      // Notify doctor
      if (doctorId) {
        await supabase.from("notifications").insert({
          user_id: doctorId,
          order_id: orderId,
          type: "shipment_update",
          title: "Shipment Updated",
          message: `Shipment details have been updated. Carrier: ${editForm.carrier_name || "N/A"}, Tracking: ${editForm.shipment_tracking || "N/A"}`,
        });
      }

      toast.success("Shipment details updated successfully");
      fetchOrders();
      cancelEditing();
    } catch (error) {
      console.error("Error updating shipment:", error);
      toast.error("Failed to update shipment details");
    }
  };

  if (loading || roleLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 bg-secondary/30 py-12">
            <div className="container px-4">
              <Skeleton className="h-10 w-64 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-12">
          <div className="container px-4">
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold">
                {isLabStaff ? "Manage Order Shipments" : "Track Your Orders"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isLabStaff 
                  ? "Update shipment status and delivery details for your orders" 
                  : "Monitor shipment status and delivery details"}
              </p>
            </div>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {isLabStaff ? "No assigned orders" : "No orders yet"}
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {isLabStaff 
                      ? "Orders you've been assigned to will appear here for shipment management"
                      : "Create your first order to start tracking shipments"
                    }
                  </p>
                  {!isLabStaff && (
                    <Button onClick={() => navigate("/new-order")}>Create Order</Button>
                  )}
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

                      {!order.driver_name && !order.carrier_name && !isLabStaff && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">
                            Shipment details will appear here once the lab processes your order
                          </p>
                        </div>
                      )}

                      {/* Lab Staff Edit Section */}
                      {isLabStaff && (
                        <div className="mt-6 pt-6 border-t">
                          {editingOrderId === order.id ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-lg">Update Shipment Details</h4>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditing}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => saveShipmentDetails(order.id, order.doctor_id!)}
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save Changes
                                  </Button>
                                </div>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="carrier_name">Carrier Name</Label>
                                  <Input
                                    id="carrier_name"
                                    value={editForm.carrier_name}
                                    onChange={(e) => setEditForm({ ...editForm, carrier_name: e.target.value })}
                                    placeholder="Enter carrier name"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="carrier_phone">Carrier Phone</Label>
                                  <Input
                                    id="carrier_phone"
                                    value={editForm.carrier_phone}
                                    onChange={(e) => setEditForm({ ...editForm, carrier_phone: e.target.value })}
                                    placeholder="Enter carrier phone"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="driver_name">Driver Name</Label>
                                  <Input
                                    id="driver_name"
                                    value={editForm.driver_name}
                                    onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })}
                                    placeholder="Enter driver name"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="driver_phone">Driver Phone (WhatsApp)</Label>
                                  <Input
                                    id="driver_phone"
                                    value={editForm.driver_phone_whatsapp}
                                    onChange={(e) => setEditForm({ ...editForm, driver_phone_whatsapp: e.target.value })}
                                    placeholder="Enter driver phone"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="shipment_tracking">Tracking Number</Label>
                                  <Input
                                    id="shipment_tracking"
                                    value={editForm.shipment_tracking}
                                    onChange={(e) => setEditForm({ ...editForm, shipment_tracking: e.target.value })}
                                    placeholder="Enter tracking number"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="tracking_location">Tracking Location</Label>
                                  <Input
                                    id="tracking_location"
                                    value={editForm.tracking_location}
                                    onChange={(e) => setEditForm({ ...editForm, tracking_location: e.target.value })}
                                    placeholder="Enter current location"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                                  <Input
                                    id="expected_delivery_date"
                                    type="date"
                                    value={editForm.expected_delivery_date}
                                    onChange={(e) => setEditForm({ ...editForm, expected_delivery_date: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="pickup_time">Pickup Time</Label>
                                  <Input
                                    id="pickup_time"
                                    type="datetime-local"
                                    value={editForm.pickup_time}
                                    onChange={(e) => setEditForm({ ...editForm, pickup_time: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <Label htmlFor="shipment_notes">Shipment Notes</Label>
                                  <Textarea
                                    id="shipment_notes"
                                    value={editForm.shipment_notes}
                                    onChange={(e) => setEditForm({ ...editForm, shipment_notes: e.target.value })}
                                    placeholder="Add any additional notes about the shipment"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Update carrier, driver, and tracking information
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(order)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Shipment Details
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
};

export default TrackOrders;
