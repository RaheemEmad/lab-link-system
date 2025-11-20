import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
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
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  restoration_type: string;
  status: string;
  urgency: string;
  created_at: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  shipment_tracking: string | null;
  assigned_lab_id: string | null;
  labs: {
    name: string;
    contact_email: string;
    contact_phone: string | null;
  } | null;
}

const OrderTracking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

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
          filter: `doctor_id=eq.${user.id}`
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
  }, [user, navigate]);

  const fetchOrders = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          patient_name,
          restoration_type,
          status,
          urgency,
          created_at,
          expected_delivery_date,
          actual_delivery_date,
          shipment_tracking,
          assigned_lab_id,
          labs (
            name,
            contact_email,
            contact_phone
          )
        `)
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });

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
                      <div className="flex items-start justify-between">
                        <div>
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
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
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

                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Order submitted on {formatDate(order.created_at)}
                        </p>
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
    </div>
  );
};

export default OrderTracking;
