import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { OrderNotes } from "@/components/order/OrderNotes";
import { OrderHistoryTimeline } from "@/components/order/OrderHistoryTimeline";
import { useNavigate, useSearchParams } from "react-router-dom";
import OrderNotesDialog from "@/components/order/OrderNotesDialog";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  MessageSquare,
  FileText,
  Mail,
  Phone,
  History
} from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  doctor_name: string;
  restoration_type: string;
  status: string;
  urgency: string;
  created_at: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  shipment_tracking: string | null;
  assigned_lab_id: string | null;
  html_export: string | null;
  screenshot_url: string | null;
  labs: {
    id: string;
    name: string;
    contact_email: string;
    contact_phone: string | null;
    description: string | null;
  } | null;
}

const OrderTracking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedOrderForNotes, setSelectedOrderForNotes] = useState<string | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchUserRole();
  }, [user, navigate]);

  useEffect(() => {
    if (userRole) {
      fetchOrders();

      // Set up realtime subscription for order updates
      const channel = supabase
        .channel('order-tracking-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {
            console.log('Order update received:', payload);
            fetchOrders(); // Refetch all orders on any change
            
            if (payload.eventType === 'UPDATE') {
              toast.success("Order Updated", {
                description: `Order ${(payload.new as any).order_number} has been updated`
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userRole, user]);

  // Handle opening notes dialog from URL params
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const openNotes = searchParams.get('openNotes');
    
    if (orderId && openNotes === 'true' && orders.length > 0) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setSelectedOrderForNotes(orderId);
        setNotesDialogOpen(true);
        // Clear the params after opening
        searchParams.delete('openNotes');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, orders, setSearchParams]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchOrders = async () => {
    if (!user || !userRole) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          patient_name,
          doctor_name,
          restoration_type,
          status,
          urgency,
          created_at,
          expected_delivery_date,
          actual_delivery_date,
          shipment_tracking,
          assigned_lab_id,
          html_export,
          screenshot_url,
          labs:assigned_lab_id (
            id,
            name,
            contact_email,
            contact_phone,
            description
          )
        `);

      // Filter based on user role
      if (userRole === 'doctor') {
        query = query.eq('doctor_id', user.id);
      } else if (userRole === 'lab_staff') {
        // For lab staff, get orders they're assigned to
        const { data: assignments } = await supabase
          .from('order_assignments')
          .select('order_id')
          .eq('user_id', user.id);
        
        if (assignments && assignments.length > 0) {
          const orderIds = assignments.map(a => a.order_id);
          query = query.in('id', orderIds);
        } else {
          setOrders([]);
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to load orders", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-5 w-5" />;
      case 'In Progress':
        return <Package className="h-5 w-5" />;
      case 'Ready for QC':
      case 'Ready for Delivery':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'Delivered':
        return <Truck className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'secondary';
      case 'In Progress':
        return 'default';
      case 'Ready for QC':
      case 'Ready for Delivery':
        return 'default';
      case 'Delivered':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDaysUntil = (dateString: string | null) => {
    if (!dateString) return null;
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="mb-6">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  // Lab staff view - different UI
  if (userRole === 'lab_staff') {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold mb-2">My Assigned Orders</h1>
              <p className="text-muted-foreground">
                Track status and history of orders assigned to you
              </p>
            </div>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Assigned Orders</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't been assigned to any orders yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {orders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <div className="grid md:grid-cols-[1fr,2fr] gap-0">
                      {/* Left side - Status info */}
                      <div className="bg-muted/30 p-6 border-r">
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(order.status)}
                              <h3 className="font-bold text-lg">{order.order_number}</h3>
                            </div>
                            <Badge variant={getStatusColor(order.status)} className="mb-2">
                              {order.status}
                            </Badge>
                            {order.urgency === 'Urgent' && (
                              <Badge variant="destructive" className="ml-2">Urgent</Badge>
                            )}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Patient</p>
                              <p className="font-medium">{order.patient_name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Doctor</p>
                              <p className="font-medium">{order.doctor_name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Type</p>
                              <p className="font-medium">{order.restoration_type}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Expected Delivery</p>
                              <p className="font-medium">{formatDate(order.expected_delivery_date)}</p>
                              {(() => {
                                const daysUntil = calculateDaysUntil(order.expected_delivery_date);
                                return daysUntil !== null && order.status !== 'Delivered' && (
                                  <p className={`text-xs ${
                                    daysUntil <= 2 ? 'text-destructive font-medium' : 'text-muted-foreground'
                                  }`}>
                                    {daysUntil > 0 
                                      ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining`
                                      : daysUntil === 0
                                      ? 'Due today'
                                      : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`
                                    }
                                  </p>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedOrderForNotes(order.id);
                                setNotesDialogOpen(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Notes
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Right side - History timeline */}
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <History className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold">Order History</h4>
                        </div>
                        <OrderHistoryTimeline orderId={order.id} orderNumber={order.order_number} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        <LandingFooter />
        <ScrollToTop />
      </div>
    );
  }

  // Doctor view - original card layout
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-secondary/30 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold mb-2">Order Tracking</h1>
            <p className="text-muted-foreground">
              Real-time updates on all your orders
            </p>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't submitted any orders yet.
                </p>
                <Button onClick={() => navigate('/new-order')}>
                  Create Your First Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const daysUntil = calculateDaysUntil(order.expected_delivery_date);
                const isUrgent = daysUntil !== null && daysUntil <= 2 && order.status !== 'Delivered';
                
                return (
                  <Card key={order.id} className={isUrgent ? 'border-destructive' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            Order {order.order_number}
                            {order.urgency === 'Urgent' && (
                              <Badge variant="destructive">Urgent</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {order.patient_name} • {order.restoration_type}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.html_export ? (
                            <button
                              onClick={() => {
                                const isUrl = order.html_export?.startsWith('http://') || order.html_export?.startsWith('https://');
                                if (isUrl) {
                                  window.open(order.html_export!, '_blank', 'noopener,noreferrer');
                                } else {
                                  const previewWindow = window.open('', '_blank');
                                  if (previewWindow && order.html_export) {
                                    previewWindow.document.write(order.html_export);
                                    previewWindow.document.close();
                                  }
                                }
                              }}
                              className="relative w-16 h-16 rounded-md overflow-hidden border border-border bg-muted flex-shrink-0 hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                              title="Click to preview HTML export"
                            >
                              {order.screenshot_url ? (
                                <img 
                                  src={order.screenshot_url} 
                                  alt="HTML Preview" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </button>
                          ) : (
                            order.labs && (
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <button
                                    onClick={() => navigate(`/labs/${order.labs!.id}`)}
                                    className="relative w-16 h-16 rounded-md overflow-hidden border border-border bg-muted flex-shrink-0 hover:border-primary transition-colors cursor-pointer flex items-center justify-center"
                                  >
                                    <Building2 className="h-6 w-6 text-muted-foreground" />
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent side="left" className="w-80">
                                  <div className="space-y-3">
                                    <div>
                                      <h4 className="font-semibold flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        {order.labs.name}
                                      </h4>
                                      {order.labs.description && (
                                        <p className="text-sm text-muted-foreground mt-1">{order.labs.description}</p>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-sm">
                                      {order.labs.contact_email && (
                                        <p className="flex items-center gap-2">
                                          <Mail className="h-3 w-3 text-muted-foreground" />
                                          {order.labs.contact_email}
                                        </p>
                                      )}
                                      {order.labs.contact_phone && (
                                        <p className="flex items-center gap-2">
                                          <Phone className="h-3 w-3 text-muted-foreground" />
                                          {order.labs.contact_phone}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full"
                                      onClick={() => navigate(`/labs/${order.labs!.id}`)}
                                    >
                                      View Lab Profile
                                      <ExternalLink className="h-3 w-3 ml-2" />
                                    </Button>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )
                          )}
                          <Badge variant={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Assigned Lab</p>
                            {order.labs ? (
                              <>
                                <p className="text-sm text-foreground font-semibold">
                                  {order.labs.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {order.labs.contact_email}
                                </p>
                                {order.labs.contact_phone && (
                                  <p className="text-xs text-muted-foreground">
                                    {order.labs.contact_phone}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Not assigned yet
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Expected Delivery</p>
                            <p className="text-sm text-foreground font-semibold">
                              {formatDate(order.expected_delivery_date)}
                            </p>
                            {daysUntil !== null && order.status !== 'Delivered' && (
                              <p className={`text-xs ${
                                daysUntil <= 2 ? 'text-destructive font-medium' : 'text-muted-foreground'
                              }`}>
                                {daysUntil > 0 
                                  ? `${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining`
                                  : daysUntil === 0
                                  ? 'Due today'
                                  : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Shipment Tracking</p>
                            {order.shipment_tracking ? (
                              <Button
                                variant="link"
                                className="h-auto p-0 text-sm font-semibold"
                                asChild
                              >
                                <a
                                  href={order.shipment_tracking}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1"
                                >
                                  Track Package
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Not available yet
                              </p>
                            )}
                            {order.actual_delivery_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Delivered: {formatDate(order.actual_delivery_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Order submitted on {formatDate(order.created_at)}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForNotes(order.id);
                            setNotesDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          View Notes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <LandingFooter />
      <ScrollToTop />
      
      {selectedOrderForNotes && (
        <OrderNotesDialog
          orderId={selectedOrderForNotes}
          orderNumber={orders.find(o => o.id === selectedOrderForNotes)?.order_number || ''}
          open={notesDialogOpen}
          onOpenChange={(open) => {
            setNotesDialogOpen(open);
            if (!open) setSelectedOrderForNotes(null);
          }}
        />
      )}
    </div>
  );
};

export default OrderTracking;
