import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, User, Send, CheckCircle, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OrdersMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [labId, setLabId] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [restorationTypeFilter, setRestorationTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

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

  // Set up realtime subscription for new orders
  useEffect(() => {
    if (!labId) return;

    const channel = supabase
      .channel('marketplace-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: 'assigned_lab_id=is.null'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["marketplace-orders", labId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["marketplace-orders", labId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [labId, queryClient]);

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

  const getRequestStatus = (orderId: string) => {
    return existingRequests?.find(r => r.order_id === orderId);
  };

  // Filter and sort orders
  const filteredOrders = orders?.filter(order => {
    if (urgencyFilter !== "all" && order.urgency !== urgencyFilter) return false;
    if (restorationTypeFilter !== "all" && order.restoration_type !== restorationTypeFilter) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "date-asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "date-desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "urgency":
        return a.urgency === "Urgent" ? -1 : 1;
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil((filteredOrders?.length || 0) / itemsPerPage);
  const paginatedOrders = filteredOrders?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [urgencyFilter, restorationTypeFilter, sortBy]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Orders Marketplace</h1>
              <p className="text-muted-foreground">
                Apply to available orders from doctors. Once approved, you'll unlock full details and can start working.
              </p>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Filters</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Urgency</label>
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All urgencies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All urgencies</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Restoration Type</label>
                    <Select value={restorationTypeFilter} onValueChange={setRestorationTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="Zirconia">Zirconia</SelectItem>
                        <SelectItem value="E-max">E-max</SelectItem>
                        <SelectItem value="PFM">PFM</SelectItem>
                        <SelectItem value="Metal">Metal</SelectItem>
                        <SelectItem value="Acrylic">Acrylic</SelectItem>
                        <SelectItem value="Crown">Crown</SelectItem>
                        <SelectItem value="Bridge">Bridge</SelectItem>
                        <SelectItem value="Zirconia Layer">Zirconia Layer</SelectItem>
                        <SelectItem value="Zirco-Max">Zirco-Max</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">Newest first</SelectItem>
                        <SelectItem value="date-asc">Oldest first</SelectItem>
                        <SelectItem value="urgency">Urgency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : !paginatedOrders || paginatedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    {filteredOrders && filteredOrders.length > 0 ? "No orders match your filters" : "No available orders"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Orders will appear here when doctors submit new cases with auto-assign enabled.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedOrders.map((order) => {
                    const requestStatus = getRequestStatus(order.id);
                    
                    return (
                      <Card key={order.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1">
                                {order.restoration_type}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Patient: {order.patient_name.split(' ').map((n: string) => n[0]).join('.')}. • Order: {order.order_number}
                              </p>
                            </div>
                            <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>
                              {order.urgency}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span>Dr. {order.doctor_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span>
                                Submitted: {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {order.biological_notes && (
                              <div className="bg-muted/50 rounded p-2 mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Notes Preview:</p>
                                <p className="text-sm line-clamp-2">{order.biological_notes}</p>
                              </div>
                            )}
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
                              Apply to this Order
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page = i + 1;
                        if (totalPages > 5) {
                          if (currentPage > 3) {
                            page = currentPage - 2 + i;
                          }
                          if (currentPage > totalPages - 3) {
                            page = totalPages - 4 + i;
                          }
                        }
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}
