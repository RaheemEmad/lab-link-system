import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, User, Send, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [labId, setLabId] = useState<string | null>(null);

  // Get lab ID for current user
  useEffect(() => {
    const fetchLabId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('lab_id')
        .eq('user_id', user.id)
        .eq('role', 'lab_staff')
        .maybeSingle();
      
      if (data?.lab_id) {
        setLabId(data.lab_id);
      }
    };
    
    fetchLabId();
  }, [user]);

  // Fetch unassigned orders (excluding those refused by this lab)
  const { data: orders, isLoading } = useQuery({
    queryKey: ["marketplace-orders", labId],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .is("assigned_lab_id", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Filter out orders where this lab has been refused
      if (!labId || !ordersData) return ordersData;

      const { data: refusedRequests } = await supabase
        .from("lab_work_requests")
        .select("order_id")
        .eq("lab_id", labId)
        .eq("status", "refused");

      const refusedOrderIds = new Set(refusedRequests?.map(r => r.order_id) || []);
      
      return ordersData.filter(order => !refusedOrderIds.has(order.id));
    },
    enabled: !!labId,
  });

  // Fetch existing requests for this lab
  const { data: existingRequests } = useQuery({
    queryKey: ["lab-requests", labId],
    queryFn: async () => {
      if (!labId) return [];
      
      const { data, error } = await supabase
        .from("lab_work_requests")
        .select("order_id, status")
        .eq("lab_id", labId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!labId,
  });

  // Send request mutation
  const sendRequest = useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id || !labId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("lab_work_requests")
        .insert({
          order_id: orderId,
          lab_id: labId,
          requested_by_user_id: user.id,
          status: 'pending'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests", labId] });
      toast({
        title: "Request sent",
        description: "Your request to work on this order has been sent to the doctor.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!labId) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  No Lab Assigned
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Your account is not currently assigned to a lab. Please contact an administrator.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">To unlock this feature:</p>
                  <p className="text-sm text-muted-foreground">
                    Send an email to{" "}
                    <a
                      href="mailto:raheem.amer.swe@gmail.com"
                      className="text-primary hover:underline"
                    >
                      raheem.amer.swe@gmail.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>
    );
  }

  const getRequestStatus = (orderId: string) => {
    return existingRequests?.find(r => r.order_id === orderId);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Orders Marketplace</h1>
              <p className="text-muted-foreground">
                Browse available orders from doctors looking for lab partners
              </p>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : !orders || orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No available orders at the moment
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders.map((order) => {
                  const requestStatus = getRequestStatus(order.id);
                  
                  return (
                    <Card key={order.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {order.order_number}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.patient_name}
                            </p>
                          </div>
                          <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>
                            {order.urgency}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Dr. {order.doctor_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{order.restoration_type}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {requestStatus ? (
                          <div className="pt-2">
                            {requestStatus.status === 'pending' ? (
                              <Badge variant="outline" className="w-full justify-center py-2">
                                <Send className="h-4 w-4 mr-2" />
                                Request Sent
                              </Badge>
                            ) : requestStatus.status === 'accepted' ? (
                              <Badge variant="default" className="w-full justify-center py-2">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accepted
                              </Badge>
                            ) : null}
                          </div>
                        ) : (
                          <Button
                            onClick={() => sendRequest.mutate(order.id)}
                            disabled={sendRequest.isPending}
                            className="w-full"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Request
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}
