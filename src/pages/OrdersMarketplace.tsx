import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, User, Send, CheckCircle, Filter, ChevronLeft, ChevronRight, XCircle, Shield, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AcceptanceAnimation } from "@/components/order/AcceptanceAnimation";
import { OrderChatWindow } from "@/components/chat/OrderChatWindow";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import BidSubmissionDialog from "@/components/order/BidSubmissionDialog";

export default function OrdersMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const [labId, setLabId] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [restorationTypeFilter, setRestorationTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [showAcceptanceAnimation, setShowAcceptanceAnimation] = useState(false);
  const [acceptedOrder, setAcceptedOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'doctor' | 'lab_staff'>('lab_staff');
  const [overrideOrderId, setOverrideOrderId] = useState<string | null>(null);
  const [selectedLabForOverride, setSelectedLabForOverride] = useState<string | null>(null);
  const [bidDialogOrder, setBidDialogOrder] = useState<any>(null);

  // Get lab ID and user role for current user
  useEffect(() => {
    const fetchLabIdAndRole = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('lab_id, role')
        .eq('user_id', user.id)
        .eq('role', 'lab_staff')
        .maybeSingle();
      
      if (data?.lab_id) {
        setLabId(data.lab_id);
      }
      if (data?.role) {
        setCurrentUserRole(data.role as 'doctor' | 'lab_staff');
      }
    };
    
    fetchLabIdAndRole();
  }, [user]);

  // Fetch marketplace orders (auto_assign_pending, unassigned, excluding refused)
  const { data: orders, isLoading } = useQuery({
    queryKey: ["marketplace-orders", labId],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .eq("auto_assign_pending", true)
        .is("assigned_lab_id", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // If no labId (new lab staff without lab assignment), show all marketplace orders
      // They can apply but won't be accepted until they're assigned to a lab
      if (!labId) return ordersData;

      // Filter out orders where this lab has been refused
      const { data: refusedRequests } = await supabase
        .from("lab_work_requests")
        .select("order_id")
        .eq("lab_id", labId)
        .eq("status", "refused");

      const refusedOrderIds = new Set(refusedRequests?.map(r => r.order_id) || []);
      
      return ordersData.filter(order => !refusedOrderIds.has(order.id));
    },
    enabled: !!user?.id, // Enable if user exists, not just labId
  });

  // Set up realtime subscription for new orders
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('marketplace-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: 'auto_assign_pending=eq.true'
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
  }, [user?.id, labId, queryClient]);

  // Set up realtime subscription for lab work requests
  useEffect(() => {
    if (!user?.id || !labId) return;

    const channel = supabase
      .channel('lab-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_work_requests',
          filter: `lab_id=eq.${labId}`
        },
        () => {
          // Invalidate both queries when lab requests change
          queryClient.invalidateQueries({ queryKey: ["lab-requests", labId] });
          queryClient.invalidateQueries({ queryKey: ["marketplace-orders", labId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, labId, queryClient]);

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
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when tab gains focus
  });

  // Fetch all active labs (for admin override)
  const { data: allLabs } = useQuery({
    queryKey: ["all-active-labs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labs")
        .select("id, name, current_load, max_capacity, performance_score")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
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

  // Cancel request mutation
  const cancelRequest = useMutation({
    mutationFn: async (orderId: string) => {
      if (!labId) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("lab_work_requests")
        .delete()
        .eq("order_id", orderId)
        .eq("lab_id", labId)
        .eq("status", "pending");
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests", labId] });
      toast({
        title: "Request canceled",
        description: "Your application has been withdrawn.",
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

  // Admin override mutation
  const adminOverrideAssignment = useMutation({
    mutationFn: async ({ orderId, labId }: { orderId: string; labId: string }) => {
      // 1. Update order with assigned lab
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          assigned_lab_id: labId,
          auto_assign_pending: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);
      
      if (orderError) throw orderError;
      
      // 2. Create order_assignment for audit trail
      const { error: assignError } = await supabase
        .from("order_assignments")
        .insert({
          order_id: orderId,
          user_id: user?.id,
          assigned_by: user?.id
        });
      
      if (assignError) throw assignError;
      
      // 3. Create lab_work_request with 'accepted' status for audit
      const { error: requestError } = await supabase
        .from("lab_work_requests")
        .insert({
          order_id: orderId,
          lab_id: labId,
          requested_by_user_id: user?.id,
          status: 'accepted'
        });
      
      if (requestError) throw requestError;
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      setOverrideOrderId(null);
      setSelectedLabForOverride(null);
      toast({
        title: "Lab Assigned",
        description: "Order has been directly assigned to the selected lab.",
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
    // Safety: Exclude orders where our request was already accepted
    const requestStatus = existingRequests?.find(r => r.order_id === order.id);
    if (requestStatus?.status === 'accepted') return false;
    
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
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6">
            <div className="mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Orders Marketplace</h1>
              <p className="text-muted-foreground">
                Apply to available orders from doctors. Once approved, you'll unlock full details and can start working.
              </p>
              {!labId && (
                <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning-foreground">
                    <strong>Note:</strong> You are not currently assigned to a lab. You can browse orders but applications will require lab assignment by an administrator.
                  </p>
                </div>
              )}
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Filters</h3>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-56 sm:h-64" />
                ))}
              </div>
            ) : !paginatedOrders || paginatedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    {filteredOrders && filteredOrders.length > 0 ? "No orders match your filters" : "No available orders"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Orders will appear here when doctors submit new cases with auto-assign enabled.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedOrders.map((order) => {
                    const requestStatus = getRequestStatus(order.id);
                    
                    return (
                      <Card key={order.id} className="hover:shadow-lg transition-shadow min-w-0">
                        <CardHeader className="p-4 sm:p-6">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base sm:text-lg mb-1 truncate">
                                {order.restoration_type}
                              </CardTitle>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                Patient: {order.patient_name.split(' ').map((n: string) => n[0]).join('.')}. • {order.order_number}
                              </p>
                            </div>
                            <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"} className="shrink-0 text-xs">
                              {order.urgency}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs sm:text-sm">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">Dr. {order.doctor_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">
                                Submitted: {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {/* Budget Display */}
                            {order.target_budget && (
                              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <DollarSign className="h-4 w-4 flex-shrink-0" />
                                <span>Budget: ${order.target_budget.toFixed(2)}</span>
                              </div>
                            )}
                            {!order.target_budget && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <DollarSign className="h-4 w-4 flex-shrink-0" />
                                <span>Budget: Open</span>
                              </div>
                            )}
                            {order.biological_notes && (
                              <div className="bg-muted/50 rounded p-2 mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                                <p className="text-xs sm:text-sm line-clamp-2">{order.biological_notes}</p>
                              </div>
                            )}
                          </div>

                          {requestStatus ? (
                            <div className="pt-2 space-y-2">
                              {requestStatus.status === 'pending' ? (
                                <>
                                  <Badge variant="outline" className="w-full justify-center py-2 text-xs">
                                    <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                                    <span>Request Sent</span>
                                  </Badge>
                                  <Button
                                    onClick={() => cancelRequest.mutate(order.id)}
                                    disabled={cancelRequest.isPending}
                                    variant="outline"
                                    className="w-full text-xs sm:text-sm"
                                  >
                                    <XCircle className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                                    <span className="truncate">Cancel</span>
                                  </Button>
                                </>
                              ) : requestStatus.status === 'accepted' ? (
                                <Badge variant="default" className="w-full justify-center py-2 text-xs">
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                                  <span>Accepted</span>
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            <Button
                              onClick={() => setBidDialogOrder(order)}
                              disabled={sendRequest.isPending}
                              className="w-full text-xs sm:text-sm"
                            >
                              <DollarSign className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                              <span className="truncate">Submit Bid</span>
                            </Button>
                          )}
                          
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOverrideOrderId(order.id);
                                setSelectedLabForOverride(null);
                              }}
                              className="w-full mt-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Admin Override
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left order-2 sm:order-1">
                      Page {currentPage} of {totalPages}
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let page = i + 1;
                          if (totalPages > 7) {
                            if (currentPage > 4) {
                              page = currentPage - 3 + i;
                            }
                            if (currentPage > totalPages - 4) {
                              page = totalPages - 6 + i;
                            }
                          }
                          
                          // On mobile, show fewer pages
                          const showOnMobile = page === 1 || page === totalPages || page === currentPage;
                          const showOnTablet = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                          
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 sm:w-10 sm:h-10 p-0",
                                !showOnMobile && "hidden xs:inline-flex",
                                !showOnTablet && "xs:hidden sm:inline-flex"
                              )}
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
                        className="gap-1"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <LandingFooter />

        {/* Admin Override Dialog */}
        <Dialog open={!!overrideOrderId} onOpenChange={() => {
          setOverrideOrderId(null);
          setSelectedLabForOverride(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin Override: Assign Lab</DialogTitle>
              <DialogDescription>
                Directly assign a lab to this order, bypassing the normal application workflow.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Lab</label>
                <Select value={selectedLabForOverride || ""} onValueChange={setSelectedLabForOverride}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a lab..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allLabs?.map(lab => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name} ({lab.current_load}/{lab.max_capacity} capacity)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setOverrideOrderId(null);
                  setSelectedLabForOverride(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (overrideOrderId && selectedLabForOverride) {
                    adminOverrideAssignment.mutate({ 
                      orderId: overrideOrderId, 
                      labId: selectedLabForOverride 
                    });
                  }
                }}
                disabled={!selectedLabForOverride || adminOverrideAssignment.isPending}
              >
                {adminOverrideAssignment.isPending ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bid Submission Dialog */}
        {bidDialogOrder && labId && (
          <BidSubmissionDialog
            order={bidDialogOrder}
            labId={labId}
            open={!!bidDialogOrder}
            onOpenChange={(open) => !open && setBidDialogOrder(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
