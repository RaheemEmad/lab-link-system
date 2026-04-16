import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Calendar, User, Send, CheckCircle, Filter, ChevronLeft, ChevronRight, XCircle, Shield, DollarSign, RefreshCw, Paperclip, Clock, BadgeCheck, Building2, Palette, Hash } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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
import RoleGuard from "@/components/auth/RoleGuard";
import { createNotification } from "@/lib/notifications";

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

  // Fetch marketplace orders with doctor info, verification, and attachment counts
  const { data: orders, isLoading } = useQuery({
    queryKey: ["marketplace-orders", labId],
    queryFn: async () => {
      // 1. Fetch orders
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("id, order_number, restoration_type, urgency, created_at, desired_delivery_date, target_budget, status, auto_assign_pending, assigned_lab_id, teeth_shade, teeth_number, doctor_id, doctor_name")
        .eq("auto_assign_pending", true)
        .is("assigned_lab_id", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (!ordersData || ordersData.length === 0) return [];

      // 2. Fetch doctor profiles for all unique doctor_ids
      const doctorIds = [...new Set(ordersData.map(o => o.doctor_id).filter(Boolean))];
      const { data: profiles } = doctorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, clinic_name")
            .in("id", doctorIds)
        : { data: [] };

      // 3. Fetch verification status for those doctors
      const { data: verifications } = doctorIds.length > 0
        ? await supabase
            .from("doctor_verification")
            .select("user_id, is_verified")
            .in("user_id", doctorIds)
        : { data: [] };

      // 4. Fetch attachment counts per order
      const orderIds = ordersData.map(o => o.id);
      const { data: attachments } = await supabase
        .from("order_attachments")
        .select("order_id")
        .in("order_id", orderIds);

      // Build lookup maps
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const verificationMap = new Map((verifications || []).map(v => [v.user_id, v.is_verified]));
      const attachmentCountMap = new Map<string, number>();
      (attachments || []).forEach(a => {
        attachmentCountMap.set(a.order_id, (attachmentCountMap.get(a.order_id) || 0) + 1);
      });

      // Enrich orders
      const enriched = ordersData.map(order => ({
        ...order,
        doctor_profile: profileMap.get(order.doctor_id) || null,
        is_verified: verificationMap.get(order.doctor_id) || false,
        attachment_count: attachmentCountMap.get(order.id) || 0,
      }));

      // If no labId, show all
      if (!labId) return enriched;

      // Filter out refused
      const { data: refusedRequests } = await supabase
        .from("lab_work_requests")
        .select("order_id")
        .eq("lab_id", labId)
        .eq("status", "refused");

      const refusedOrderIds = new Set(refusedRequests?.map(r => r.order_id) || []);
      return enriched.filter(order => !refusedOrderIds.has(order.id));
    },
    enabled: !!user?.id,
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
        .select("id, name, current_load, max_capacity, performance_score, pricing_mode")
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
    onSuccess: async (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["lab-requests", labId] });
      // Notify the doctor that a lab applied
      const { data: order } = await supabase
        .from("orders")
        .select("doctor_id, order_number")
        .eq("id", orderId)
        .single();
      if (order?.doctor_id) {
        await createNotification({
          user_id: order.doctor_id,
          order_id: orderId,
          type: "new_marketplace_application",
          title: "New Lab Application",
          message: `A lab has applied to work on order #${order.order_number}`,
        });
      }
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
      // Pre-check: Verify lab has pricing configured
      const { data: labPricingCheck, error: pricingError } = await supabase
        .from('labs')
        .select('pricing_mode, name')
        .eq('id', labId)
        .single();
      
      if (pricingError) {
        throw new Error('Failed to verify lab pricing configuration.');
      }
      
      if (!labPricingCheck?.pricing_mode) {
        throw new Error(
          `Cannot assign order to ${labPricingCheck?.name || 'this lab'}. The lab has not configured their pricing yet. Please ask the lab to set up pricing in Lab Admin > Pricing first.`
        );
      }
      
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
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
      // Notify lab staff of assignment
      const { data: labStaff } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("lab_id", variables.labId)
        .eq("role", "lab_staff");
      const { data: order } = await supabase
        .from("orders")
        .select("doctor_id, order_number")
        .eq("id", variables.orderId)
        .single();
      if (labStaff?.length && order) {
        const notifications = labStaff.map((s) => ({
          user_id: s.user_id,
          order_id: variables.orderId,
          type: "admin_order_override",
          title: "Order Assigned by Admin",
          message: `You've been assigned order #${order.order_number}`,
        }));
        // Also notify doctor
        notifications.push({
          user_id: order.doctor_id,
          order_id: variables.orderId,
          type: "admin_order_override",
          title: "Lab Assigned to Your Order",
          message: `An admin has assigned a lab to order #${order.order_number}`,
        });
        await supabase.from("notifications").insert(notifications);
      }
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
    <RoleGuard allowedRoles={["lab_staff", "admin"]}>
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
              <EmptyState
                icon={Package}
                title={filteredOrders && filteredOrders.length > 0 ? "No orders match your filters" : "No available orders"}
                description="Orders will appear here when doctors submit new cases with auto-assign enabled."
                actionLabel="Refresh"
                onAction={() => queryClient.invalidateQueries({ queryKey: ["marketplace-orders", labId] })}
                actionIcon={RefreshCw}
              />
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
                                {order.order_number}
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
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">
                                Submitted: {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {/* Budget Display */}
                            {order.target_budget && (
                              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <DollarSign className="h-4 w-4 flex-shrink-0" />
                                <span>Budget: EGP {order.target_budget.toLocaleString('en-EG', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                            {!order.target_budget && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <DollarSign className="h-4 w-4 flex-shrink-0" />
                                <span>Budget: Open</span>
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
    </RoleGuard>
  );
}
