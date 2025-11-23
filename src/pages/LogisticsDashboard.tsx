import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Truck, Package, AlertTriangle, TrendingUp, BarChart3, Factory, Edit, ArrowLeft } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ShipmentDetailsDialog } from "@/components/order/ShipmentDetailsDialog";
import { toast } from "sonner";
interface LabCapacity {
  id: string;
  name: string;
  current_load: number;
  max_capacity: number;
  performance_score: number | null;
}
interface OrderShipment {
  id: string;
  order_number: string;
  patient_name: string;
  status: string;
  shipment_tracking: string | null;
  handling_instructions: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  urgency: string;
  desired_delivery_date: string | null;
  proposed_delivery_date: string | null;
  delivery_date_comment: string | null;
  carrier_name: string | null;
  carrier_phone: string | null;
  assigned_lab: {
    name: string;
  } | null;
}
const LogisticsDashboard = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [labCapacity, setLabCapacity] = useState<LabCapacity[]>([]);
  const [shipments, setShipments] = useState<OrderShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<OrderShipment | null>(null);
  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const {
        data
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      if (data?.role !== "admin" && data?.role !== "lab_staff" && data?.role !== "doctor") {
        toast.error("Access denied");
        navigate("/dashboard");
        return;
      }
      setUserRole(data.role);
    };
    checkRole();
  }, [user, navigate]);
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userRole) return;
      try {
        setLoading(true);

        // Fetch shipment data (orders with tracking or handling instructions)
        let shipmentQuery = supabase.from("orders").select(`
            id,
            order_number,
            patient_name,
            status,
            shipment_tracking,
            handling_instructions,
            expected_delivery_date,
            actual_delivery_date,
            urgency,
            desired_delivery_date,
            proposed_delivery_date,
            delivery_date_comment,
            carrier_name,
            carrier_phone,
            assigned_lab:labs(name)
          `).not("assigned_lab_id", "is", null).order("expected_delivery_date", {
          ascending: true
        });

        // Filter based on user role
        if (userRole === "lab_staff") {
          const {
            data: roleData
          } = await supabase.from("user_roles").select("lab_id").eq("user_id", user.id).single();
          if (roleData?.lab_id) {
            shipmentQuery = shipmentQuery.eq("assigned_lab_id", roleData.lab_id);
          }
        } else if (userRole === "doctor") {
          shipmentQuery = shipmentQuery.eq("doctor_id", user.id);
        }
        const {
          data: orders,
          error: orderError
        } = await shipmentQuery;
        if (orderError) throw orderError;
        setShipments(orders || []);
      } catch (error) {
        console.error("Error fetching logistics data:", error);
        toast.error("Failed to load logistics data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Set up realtime subscription
    const channel = supabase.channel("logistics-updates").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "orders"
    }, () => {
      fetchData();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "Ready for Delivery":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "In Progress":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };
  const getCapacityStatus = (current: number, max: number) => {
    const percentage = current / max * 100;
    if (percentage >= 90) return {
      color: "destructive",
      label: "Critical"
    };
    if (percentage >= 70) return {
      color: "warning",
      label: "High"
    };
    if (percentage >= 50) return {
      color: "default",
      label: "Moderate"
    };
    return {
      color: "secondary",
      label: "Low"
    };
  };
  const urgentShipments = shipments.filter(s => s.urgency === "Urgent").length;
  const pendingDeliveries = shipments.filter(s => s.status === "Ready for Delivery" && !s.actual_delivery_date).length;
  const totalShipments = shipments.length;
  if (loading) {
    return <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 bg-secondary/30 py-12">
            <div className="container px-4">
              <Skeleton className="h-10 w-64 mb-6" />
              <div className="grid gap-6 md:grid-cols-3 mb-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
              <Skeleton className="h-96" />
            </div>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>;
  }
  return <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-12">
          <div className="container px-4">
            <div className="mb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center justify-center gap-4">
                <h1 className="text-3xl font-bold">Logistics Dashboard</h1>
                <Badge variant="outline" className="text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Real-time Updates
                </Badge>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalShipments}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Active orders in transit
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingDeliveries}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ready for shipment
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{urgentShipments}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Require priority handling
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Shipment Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Active Shipments
                </CardTitle>
                <CardDescription>Track deliveries and handling requirements</CardDescription>
              </CardHeader>
              <CardContent>
                {shipments.length === 0 ? <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active shipments</p>
                  </div> : <div className="space-y-4">
                    {shipments.map(shipment => <div key={shipment.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold">{shipment.order_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {shipment.patient_name}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(shipment.status)}>
                              {shipment.status}
                            </Badge>
                            {shipment.urgency === "Urgent" && <Badge variant="destructive">Urgent</Badge>}
                          </div>
                        </div>

                        {shipment.assigned_lab && <div className="text-sm text-muted-foreground mb-2">
                            Lab: {shipment.assigned_lab.name}
                          </div>}

                        {shipment.shipment_tracking && <div className="flex items-center gap-2 text-sm mb-2">
                            <Truck className="h-4 w-4" />
                            <span className="font-mono">{shipment.shipment_tracking}</span>
                          </div>}

                        {shipment.handling_instructions && <div className="flex items-start gap-2 text-sm bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                            <div>
                              <div className="font-medium text-yellow-700 dark:text-yellow-400">
                                Handling Instructions:
                              </div>
                              <div className="text-yellow-600 dark:text-yellow-300">
                                {shipment.handling_instructions}
                              </div>
                            </div>
                          </div>}

                        {/* Delivery Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {shipment.desired_delivery_date && <div className="text-sm">
                              <span className="text-muted-foreground">Desired: </span>
                              <span className="font-medium">
                                {new Date(shipment.desired_delivery_date).toLocaleDateString()}
                              </span>
                            </div>}
                          {shipment.proposed_delivery_date && <div className="text-sm">
                              <span className="text-muted-foreground">Proposed: </span>
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {new Date(shipment.proposed_delivery_date).toLocaleDateString()}
                              </span>
                            </div>}
                        </div>

                        {/* Carrier Information */}
                        {shipment.carrier_name && <div className="flex items-center gap-4 text-sm mt-3 bg-blue-500/10 p-2 rounded">
                            <div>
                              <span className="text-muted-foreground">Carrier: </span>
                              <span className="font-medium">{shipment.carrier_name}</span>
                            </div>
                            {shipment.carrier_phone && <div>
                                <span className="text-muted-foreground">Phone: </span>
                                <span className="font-medium">{shipment.carrier_phone}</span>
                              </div>}
                          </div>}

                        {/* Edit/View Button */}
                        <div className="mt-3">
                          <Button size="sm" variant="outline" onClick={() => setSelectedShipment(shipment)} className="w-full">
                            <Edit className="h-4 w-4 mr-2" />
                            {userRole === "lab_staff" && shipment.status === "Ready for Delivery" ? "Edit Shipment Details" : "View Shipment Details & Notes"}
                          </Button>
                        </div>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>
          </div>
        </div>
        <LandingFooter />
      </div>

      {/* Shipment Details Dialog */}
      {selectedShipment && <ShipmentDetailsDialog open={!!selectedShipment} onOpenChange={open => !open && setSelectedShipment(null)} order={selectedShipment} onUpdate={() => {
      setSelectedShipment(null);
      window.location.reload();
    }} userRole={userRole} />}
    </ProtectedRoute>;
};
export default LogisticsDashboard;