import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Package, AlertTriangle, TrendingUp, BarChart3, Factory, Edit, ArrowLeft, FileText, Eye, Receipt, CalendarDays, Clock } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ShipmentDetailsDialog } from "@/components/order/ShipmentDetailsDialog";
import { OrderDetailsModal } from "@/components/order/OrderDetailsModal";
import { LoadingScreen } from "@/components/ui/loading-screen";
import BillingTab from "@/components/billing/BillingTab";
import { TrackingTabContent } from "@/components/logistics/TrackingTabContent";
import { CalendarTabContent } from "@/components/logistics/CalendarTabContent";
import { AnalyticsTabContent } from "@/components/logistics/AnalyticsTabContent";
import { SchedulingTabContent } from "@/components/logistics/SchedulingTabContent";
import { useLogisticsTabBadges } from "@/hooks/useLogisticsTabBadges";
import { toast } from "sonner";

interface OrderShipment {
  id: string;
  order_number: string;
  patient_name: string;
  doctor_name: string;
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
  driver_name: string | null;
  driver_phone_whatsapp: string | null;
  pickup_time: string | null;
  tracking_location: string | null;
  shipment_notes: string | null;
  created_at: string;
  restoration_type: string;
  teeth_number: string;
  teeth_shade: string;
  shade_system: string | null;
  biological_notes: string | null;
  assigned_lab: { name: string } | null;
}

type TabValue = "shipments" | "tracking" | "calendar" | "analytics" | "scheduling" | "billing";

const LogisticsDashboard = () => {
  const { user } = useAuth();
  const { role, roleConfirmed, isLabStaff, isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<OrderShipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<OrderShipment | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderShipment | null>(null);
  const [defaultTab, setDefaultTab] = useState<"details" | "notes">("details");
  const tabBadges = useLogisticsTabBadges(user?.id, shipments);

  // Determine active tab from URL or default
  const tabParam = searchParams.get("tab") as TabValue | null;
  const [activeMainTab, setActiveMainTab] = useState<TabValue>(tabParam || "shipments");

  // Sync tab to URL
  const handleTabChange = (value: string) => {
    const tab = value as TabValue;
    setActiveMainTab(tab);
    if (tab === "shipments") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || roleLoading) return;
      try {
        setLoading(true);
        let shipmentQuery = supabase.from("orders").select(`
            id, order_number, patient_name, doctor_name, status, shipment_tracking,
            handling_instructions, expected_delivery_date, actual_delivery_date, urgency,
            desired_delivery_date, proposed_delivery_date, delivery_date_comment,
            carrier_name, carrier_phone, driver_name, driver_phone_whatsapp,
            pickup_time, tracking_location, shipment_notes, created_at,
            restoration_type, teeth_number, teeth_shade, shade_system, biological_notes,
            assigned_lab:labs(name)
          `).not("assigned_lab_id", "is", null).order("created_at", { ascending: false });

        if (role === "lab_staff") {
          const { data: roleData } = await supabase.from("user_roles").select("lab_id").eq("user_id", user.id).maybeSingle();
          if (roleData?.lab_id) shipmentQuery = shipmentQuery.eq("assigned_lab_id", roleData.lab_id);
        } else if (role === "doctor") {
          shipmentQuery = shipmentQuery.eq("doctor_id", user.id);
        }

        const { data: orders, error: orderError } = await shipmentQuery;
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
    const channel = supabase.channel("logistics-updates").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, role, roleLoading]);

  // Handle URL parameters for auto-opening notes dialog
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const openNotes = searchParams.get('openNotes');
    if (orderId && openNotes === 'true' && shipments.length > 0) {
      const shipment = shipments.find(s => s.id === orderId);
      if (shipment) {
        setDefaultTab("notes");
        setSelectedShipment(shipment);
        toast.success("New note received", { description: `Opening notes for order ${shipment.order_number}` });
        searchParams.delete('openNotes');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, shipments, setSearchParams]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "Ready for Delivery": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "In Progress": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  // Calculate metrics
  const totalShipments = shipments.length;
  const activeShipments = shipments.filter(s => s.driver_name || s.carrier_name).length;
  const ordersInTransit = shipments.filter(s => s.status === "In Progress" || s.status === "Ready for QC").length;
  const pendingDeliveries = shipments.filter(s => s.status === "Ready for Delivery" && !s.actual_delivery_date).length;
  const readyForShipment = shipments.filter(s => s.status === "Ready for Delivery").length;
  const urgentShipments = shipments.filter(s => s.urgency === "Urgent").length;
  const priorityHandling = shipments.filter(s => s.urgency === "Urgent" && s.status !== "Delivered").length;

  if (roleLoading || loading) {
    return <ProtectedRoute><LoadingScreen message="Loading logistics data..." /></ProtectedRoute>;
  }

  const showCalendarTab = roleConfirmed && (isLabStaff || isAdmin);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6">
            <div className="mb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 mb-4">
                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
              </Button>
              <div className="flex flex-col items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Logistics Dashboard</h1>
                <Badge variant="outline" className="text-sm"><TrendingUp className="h-3 w-3 mr-1" /> Real-time Updates</Badge>
              </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeMainTab} onValueChange={handleTabChange} className="mb-6">
              <TabsList className="w-full flex overflow-x-auto">
                <TabsTrigger value="shipments" className="gap-1.5 flex-shrink-0"><Truck className="h-4 w-4" /><span className="hidden sm:inline">Shipments</span>{tabBadges.shipments > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">{tabBadges.shipments}</span>}</TabsTrigger>
                <TabsTrigger value="tracking" className="gap-1.5 flex-shrink-0"><Package className="h-4 w-4" /><span className="hidden sm:inline">Tracking</span>{tabBadges.tracking > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">{tabBadges.tracking}</span>}</TabsTrigger>
                {showCalendarTab && (
                  <TabsTrigger value="calendar" className="gap-1.5 flex-shrink-0"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Calendar</span></TabsTrigger>
                )}
                <TabsTrigger value="analytics" className="gap-1.5 flex-shrink-0"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Analytics</span></TabsTrigger>
                <TabsTrigger value="scheduling" className="gap-1.5 flex-shrink-0"><Clock className="h-4 w-4" /><span className="hidden sm:inline">Scheduling</span>{tabBadges.scheduling > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">{tabBadges.scheduling}</span>}</TabsTrigger>
                <TabsTrigger value="billing" className="gap-1.5 flex-shrink-0"><Receipt className="h-4 w-4" /><span className="hidden sm:inline">Billing</span>{tabBadges.billing > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">{tabBadges.billing}</span>}</TabsTrigger>
              </TabsList>

              <TabsContent value="shipments" className="mt-6">
                {/* Key Metrics */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Shipments</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalShipments}</div><p className="text-xs text-muted-foreground mt-1">All tracked orders</p></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Shipments</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activeShipments}</div><p className="text-xs text-muted-foreground mt-1">With driver assigned</p></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">In Transit</CardTitle><Package className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ordersInTransit}</div><p className="text-xs text-muted-foreground mt-1">Currently being transported</p></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingDeliveries}</div><p className="text-xs text-muted-foreground mt-1">Awaiting final delivery</p></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ready for Shipment</CardTitle><Package className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600 dark:text-green-400">{readyForShipment}</div><p className="text-xs text-muted-foreground mt-1">Ready to be dispatched</p></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Urgent Orders</CardTitle><AlertTriangle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{urgentShipments}</div><p className="text-xs text-muted-foreground mt-1">All urgent cases</p></CardContent></Card>
                  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Priority Handling</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600 dark:text-red-400">{priorityHandling}</div><p className="text-xs text-muted-foreground mt-1">Requiring special attention</p></CardContent></Card>
                </div>

                {/* Shipment Tracking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Active Shipments</CardTitle>
                    <CardDescription>Track deliveries and handling requirements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shipments.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No active shipments</p></div>
                    ) : (
                      <div className="space-y-4">
                        {shipments.map(shipment => (
                          <div key={shipment.id} className="border rounded-lg p-4 hover:bg-primary/5 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-semibold">{shipment.order_number}</div>
                                <div className="text-sm text-muted-foreground">{shipment.patient_name}</div>
                                <div className="text-xs text-muted-foreground mt-1">{new Date(shipment.created_at).toLocaleDateString()} at {new Date(shipment.created_at).toLocaleTimeString()} • Dr. {shipment.doctor_name}</div>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getStatusColor(shipment.status)}>{shipment.status}</Badge>
                                {shipment.urgency === "Urgent" && <Badge variant="destructive">Urgent</Badge>}
                              </div>
                            </div>
                            {shipment.assigned_lab && <div className="text-sm text-muted-foreground mb-2">Lab: {shipment.assigned_lab.name}</div>}
                            {shipment.shipment_tracking && <div className="flex items-center gap-2 text-sm mb-2"><Truck className="h-4 w-4" /><span className="font-mono">{shipment.shipment_tracking}</span></div>}
                            {shipment.handling_instructions && (
                              <div className="flex items-start gap-2 text-sm bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                                <div><div className="font-medium text-yellow-700 dark:text-yellow-400">Handling Instructions:</div><div className="text-yellow-600 dark:text-yellow-300">{shipment.handling_instructions}</div></div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {shipment.desired_delivery_date && <div className="text-sm"><span className="text-muted-foreground">Desired: </span><span className="font-medium">{new Date(shipment.desired_delivery_date).toLocaleDateString()}</span></div>}
                              {shipment.proposed_delivery_date && <div className="text-sm"><span className="text-muted-foreground">Proposed: </span><span className="font-medium text-blue-600 dark:text-blue-400">{new Date(shipment.proposed_delivery_date).toLocaleDateString()}</span></div>}
                            </div>
                            {shipment.carrier_name && (
                              <div className="flex items-center gap-4 text-sm mt-3 bg-blue-500/10 p-2 rounded">
                                <div><span className="text-muted-foreground">Carrier: </span><span className="font-medium">{shipment.carrier_name}</span></div>
                                {shipment.carrier_phone && <div><span className="text-muted-foreground">Phone: </span><span className="font-medium">{shipment.carrier_phone}</span></div>}
                              </div>
                            )}
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedOrderForDetails(shipment)}><FileText className="h-4 w-4 mr-2" />Order Details</Button>
                              <Button size="sm" variant="outline" onClick={() => setSelectedShipment(shipment)}>
                                {roleConfirmed && role === "lab_staff" ? (<><Edit className="h-4 w-4 mr-2" />Edit Shipment & Notes</>) : (<><Eye className="h-4 w-4 mr-2" />View Shipment & Notes</>)}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tracking" className="mt-6">
                <TrackingTabContent />
              </TabsContent>

              {showCalendarTab && (
                <TabsContent value="calendar" className="mt-6">
                  <CalendarTabContent />
                </TabsContent>
              )}

              <TabsContent value="analytics" className="mt-6">
                <AnalyticsTabContent />
              </TabsContent>

              <TabsContent value="scheduling" className="mt-6">
                <SchedulingTabContent />
              </TabsContent>

              <TabsContent value="billing" className="mt-6">
                <BillingTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <LandingFooter />
      </div>

      {selectedShipment && (
        <ShipmentDetailsDialog
          open={!!selectedShipment}
          onOpenChange={(open) => { if (!open) { setSelectedShipment(null); setDefaultTab("details"); } }}
          order={selectedShipment}
          onUpdate={() => { setSelectedShipment(null); window.location.reload(); }}
          userRole={roleConfirmed ? (role || undefined) : undefined}
          defaultTab={defaultTab}
        />
      )}

      {selectedOrderForDetails && (
        <OrderDetailsModal
          open={!!selectedOrderForDetails}
          onOpenChange={(open) => !open && setSelectedOrderForDetails(null)}
          order={selectedOrderForDetails}
        />
      )}
    </ProtectedRoute>
  );
};

export default LogisticsDashboard;
