import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, MapPin, Star, TrendingUp, ExternalLink, Building2, DollarSign, MessageSquare, RefreshCw, TrendingDown, Minus, FileStack } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AcceptanceAnimation } from "@/components/order/AcceptanceAnimation";
import { OrderChatWindow } from "@/components/chat/OrderChatWindow";
import BidRevisionDialog from "@/components/order/BidRevisionDialog";

// Helper function to format EGP currency
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

export default function LabRequestsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLab, setSelectedLab] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [acceptedRequest, setAcceptedRequest] = useState<{ id: string; orderId: string; orderNumber: string } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [selectedRequestForRevision, setSelectedRequestForRevision] = useState<any>(null);
  const currentUserRole = 'doctor' as const;
  
  // Refs for scrolling to application cards
  const applicationCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch all requests for this doctor's orders with full lab details and bid info
  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ["lab-requests-doctor", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('[LabRequests] No user ID, returning empty array');
        return [];
      }
      
      console.log('[LabRequests] Fetching lab work requests for doctor:', user.id);
      
      const { data, error } = await supabase
        .from("lab_work_requests")
        .select(`
          id,
          created_at,
          updated_at,
          status,
          lab_id,
          order_id,
          requested_by_user_id,
          bid_amount,
          bid_notes,
          bid_status,
          revision_requested_at,
          revision_request_note,
          revised_amount,
          revised_at,
          orders!inner (
            id,
            order_number,
            patient_name,
            restoration_type,
            urgency,
            doctor_id,
            target_budget
          ),
          labs!inner (
            id,
            name,
            description,
            logo_url,
            address,
            contact_email,
            contact_phone,
            website_url,
            pricing_tier,
            performance_score,
            standard_sla_days,
            urgent_sla_days,
            current_load,
            max_capacity
          )
        `)
        .eq('orders.doctor_id', user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error('[LabRequests] Error fetching requests:', error);
        throw error;
      }
      
      console.log('[LabRequests] Successfully fetched requests:', data?.length || 0);
      return data || [];
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: 1000,
  });

  // Update request status (Accept/Decline)
  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status, orderId, orderNumber, bidAmount }: { 
      requestId: string; 
      status: string; 
      orderId?: string; 
      orderNumber?: string;
      bidAmount?: number;
    }) => {
      console.log('[LabRequests] Updating request status:', { requestId, status });
      
      // Get the request details first (to get lab_id and user_id)
      const { data: requestData, error: fetchError } = await supabase
        .from("lab_work_requests")
        .select("lab_id, requested_by_user_id, bid_amount, revised_amount")
        .eq("id", requestId)
        .single();
      
      if (fetchError) {
        console.error('[LabRequests] Error fetching request data:', fetchError);
        throw fetchError;
      }
      
      if (!requestData) {
        throw new Error("Request not found");
      }
      
      // 1. Update the request status and bid_status
      const { error: requestError } = await supabase
        .from("lab_work_requests")
        .update({ 
          status,
          bid_status: status === 'accepted' ? 'accepted' : status === 'refused' ? 'refused' : undefined
        })
        .eq("id", requestId);
      
      if (requestError) {
        console.error('[LabRequests] Error updating request status:', requestError);
        throw requestError;
      }
      
      // If accepting, do the full assignment flow
      if (status === 'accepted' && orderId) {
        console.log('[LabRequests] Accepting request - starting full assignment flow');
        
        // Determine the agreed fee (revised_amount if exists, else bid_amount)
        const agreedFee = requestData.revised_amount || requestData.bid_amount || bidAmount;
        
        // 2. Update the order - assign lab, disable marketplace, set agreed fee
        const { error: orderError } = await supabase
          .from("orders")
          .update({ 
            assigned_lab_id: requestData.lab_id,
            auto_assign_pending: false,
            agreed_fee: agreedFee,
            agreed_fee_at: new Date().toISOString(),
            agreed_fee_by_doctor: user?.id
          })
          .eq("id", orderId);
        
        if (orderError) {
          console.error('[LabRequests] Error updating order:', orderError);
          throw orderError;
        }
        
        console.log('[LabRequests] Order updated - lab assigned and removed from marketplace');
        
        // 3. Create order assignment
        const { error: assignmentError } = await supabase
          .from("order_assignments")
          .insert({
            order_id: orderId,
            user_id: requestData.requested_by_user_id,
            assigned_by: user?.id
          });
        
        // Ignore if assignment already exists (duplicate key)
        if (assignmentError && !assignmentError.message?.includes('duplicate')) {
          console.warn('[LabRequests] Assignment creation warning:', assignmentError);
        } else {
          console.log('[LabRequests] Order assignment created');
        }
        
        // 4. Refuse all other pending requests for this order
        const { error: refuseError } = await supabase
          .from("lab_work_requests")
          .update({ status: 'refused', bid_status: 'refused' })
          .eq("order_id", orderId)
          .neq("id", requestId)
          .eq("status", "pending");
        
        if (refuseError) {
          console.warn('[LabRequests] Error refusing other requests:', refuseError);
        } else {
          console.log('[LabRequests] Other pending requests refused');
        }
        
        // 5. Send notification to accepted lab
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: requestData.requested_by_user_id,
            order_id: orderId,
            type: 'bid_accepted',
            title: 'Bid Accepted!',
            message: `Your bid of ${formatEGP(agreedFee || 0)} for order ${orderNumber} has been accepted. You can now view full order details and begin work.`
          });
        
        if (notifError) {
          console.warn('[LabRequests] Error sending notification:', notifError);
        } else {
          console.log('[LabRequests] Acceptance notification sent to lab');
        }
      }
      
      console.log('[LabRequests] Request status update completed successfully');
      return { requestId, orderId, orderNumber };
    },
    onSuccess: (data, variables) => {
      if (variables.status === 'accepted' && data.orderNumber && data.orderId) {
        console.log('[LabRequests] Request accepted, showing animation');
        setAcceptedRequest({ id: variables.requestId, orderId: data.orderId, orderNumber: data.orderNumber });
      } else {
        console.log('[LabRequests] Request declined, invalidating queries');
        queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        
        toast({
          title: "Request Updated",
          description: variables.status === 'refused' 
            ? "The lab application has been declined." 
            : "Request status updated successfully.",
        });
      }
    },
    onError: (error: any) => {
      console.error('[LabRequests] Mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update request status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set up real-time subscription for lab work requests
  useEffect(() => {
    if (!user?.id) return;

    console.log('[LabRequests] Setting up real-time subscription for doctor:', user.id);

    const channel = supabase
      .channel('lab-work-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_work_requests',
        },
        (payload) => {
          console.log('[LabRequests] Real-time update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('[LabRequests] New lab request detected, refetching data');
            queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user.id] });
            
            toast({
              title: "New Lab Application",
              description: "A lab has applied to work on one of your orders.",
            });
          } else if (payload.eventType === 'UPDATE') {
            console.log('[LabRequests] Lab request status changed, refetching data');
            queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user.id] });
          } else if (payload.eventType === 'DELETE') {
            console.log('[LabRequests] Lab request deleted, refetching data');
            queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user.id] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[LabRequests] Subscription status:', status);
      });

    return () => {
      console.log('[LabRequests] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast]);

  // Calculate pending applications count (memoized for real-time updates)
  const pendingApplications = useMemo(() => {
    if (!requests) return [];
    return requests.filter((r: any) => r.status === 'pending');
  }, [requests]);

  const pendingCount = pendingApplications.length;

  // Calculate if more pending applications exist after accepting current one
  const hasMorePendingApplications = useMemo(() => {
    if (!requests || !acceptedRequest) return false;
    
    // Count pending applications from OTHER orders (excluding accepted order)
    const pendingFromOtherOrders = requests.filter(
      (r: any) => 
        r.orders?.id !== acceptedRequest.orderId && 
        r.status === 'pending'
    );
    
    return pendingFromOtherOrders.length > 0;
  }, [requests, acceptedRequest]);

  // Scroll to next pending application card
  const scrollToNextPending = useCallback(() => {
    if (!requests) return;
    
    // Find the first pending application
    const nextPending = requests.find((r: any) => r.status === 'pending');
    
    if (nextPending) {
      const cardElement = applicationCardRefs.current.get(nextPending.id);
      if (cardElement) {
        cardElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add highlight effect
        cardElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          cardElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    }
  }, [requests]);

  // Helper function to get bid comparison indicator
  const getBidComparison = (bidAmount: number, targetBudget: number | null) => {
    if (!targetBudget || !bidAmount) return null;
    const diff = ((bidAmount - targetBudget) / targetBudget) * 100;
    
    if (diff > 20) {
      return { icon: TrendingUp, text: `${diff.toFixed(0)}% over`, color: 'text-destructive', bgColor: 'bg-destructive/10' };
    } else if (diff > 0) {
      return { icon: TrendingUp, text: `${diff.toFixed(0)}% over`, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/10' };
    } else if (diff < -5) {
      return { icon: TrendingDown, text: `${Math.abs(diff).toFixed(0)}% under`, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/10' };
    }
    return { icon: Minus, text: 'Within budget', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/10' };
  };

  // Helper function to get bid status badge
  const getBidStatusBadge = (bidStatus: string | null) => {
    switch (bidStatus) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'revision_requested':
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><RefreshCw className="h-3 w-3 mr-1" />Revision Requested</Badge>;
      case 'revised':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><MessageSquare className="h-3 w-3 mr-1" />Revised Bid</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'refused':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <LoadingScreen message="Loading lab applications..." />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex flex-col">
          <LandingNav />
          <div className="flex-1 bg-secondary/30 py-8 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="py-12 text-center">
                <p className="text-destructive font-semibold mb-4">Error Loading Lab Applications</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
                </p>
                <Button onClick={() => refetch()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
          <LandingFooter />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {acceptedRequest && (
        <AcceptanceAnimation
          orderNumber={acceptedRequest.orderNumber}
          orderId={acceptedRequest.orderId}
          onChatOpen={() => setShowChat(true)}
          hasMoreApplications={hasMorePendingApplications}
          onStayOnPage={() => {
            toast({
              title: "Lab Assigned Successfully",
              description: `Order ${acceptedRequest.orderNumber} is now in progress.`,
              action: hasMorePendingApplications ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={scrollToNextPending}
                  className="ml-2"
                >
                  Review Next
                </Button>
              ) : undefined,
            });
          }}
          onComplete={() => {
            setAcceptedRequest(null);
            queryClient.invalidateQueries({ queryKey: ["lab-requests-doctor", user?.id] });
            queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
          }}
        />
      )}

      {showChat && acceptedRequest && (
        <OrderChatWindow
          orderId={acceptedRequest.orderId}
          orderNumber={acceptedRequest.orderNumber}
          currentUserRole={currentUserRole}
          onClose={() => setShowChat(false)}
        />
      )}

      {selectedRequestForRevision && (
        <BidRevisionDialog
          requestId={selectedRequestForRevision.id}
          orderId={selectedRequestForRevision.order_id}
          orderNumber={selectedRequestForRevision.orders?.order_number || ''}
          originalBid={selectedRequestForRevision.revised_amount || selectedRequestForRevision.bid_amount || 0}
          revisionNote={null}
          mode="request"
          open={revisionDialogOpen}
          onOpenChange={(open) => {
            setRevisionDialogOpen(open);
            if (!open) setSelectedRequestForRevision(null);
          }}
        />
      )}
      
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Lab Applications</h1>
                {pendingCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    <FileStack className="h-3 w-3 mr-1" />
                    {pendingCount} pending
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Review lab profiles, bids, and approve or decline applications for your auto-assign orders
              </p>
            </div>

            {!requests || requests.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-base sm:text-lg font-medium mb-2">
                    No lab applications at the moment
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    When labs apply to your auto-assign orders, they'll appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {requests.map((request: any) => {
                  const lab = request.labs;
                  const order = request.orders;
                  const capacityPercentage = lab?.max_capacity 
                    ? (lab.current_load / lab.max_capacity) * 100 
                    : 0;
                  
                  const currentBidAmount = request.revised_amount || request.bid_amount;
                  const bidComparison = getBidComparison(currentBidAmount, order?.target_budget);
                  
                  return (
                    <Card 
                      key={request.id} 
                      ref={(el) => {
                        if (el) applicationCardRefs.current.set(request.id, el);
                        else applicationCardRefs.current.delete(request.id);
                      }}
                      className="hover:shadow-lg transition-shadow transition-all duration-300"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            {lab?.logo_url && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <img 
                                  src={lab.logo_url} 
                                  alt={lab.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <CardTitle className="text-xl">{lab?.name || 'Unknown Lab'}</CardTitle>
                                <Badge 
                                  variant={
                                    request.status === 'pending' ? 'secondary' : 
                                    request.status === 'accepted' ? 'default' : 
                                    'destructive'
                                  }
                                >
                                  {request.status}
                                </Badge>
                              </div>
                              <CardDescription className="line-clamp-2">
                                {lab?.description || 'No description available'}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Order Info */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold mb-3">Order Details</h4>
                          <div className="grid gap-3 sm:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Order Number</p>
                              <p className="font-medium">{order?.order_number}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Patient</p>
                              <p className="font-medium">{order?.patient_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Type</p>
                              <p className="font-medium">{order?.restoration_type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Your Budget</p>
                              <p className="font-medium text-primary">
                                {order?.target_budget ? formatEGP(order.target_budget) : 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Bid Information Section */}
                        {request.bid_amount && (
                          <div className={`rounded-lg p-4 border-2 ${bidComparison?.bgColor || 'bg-muted/30'}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <DollarSign className="h-5 w-5 text-primary" />
                              <h4 className="text-sm font-semibold">Bid Information</h4>
                              {getBidStatusBadge(request.bid_status)}
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Lab's Bid</p>
                                <p className="text-lg font-bold text-primary">
                                  {formatEGP(request.bid_amount)}
                                </p>
                              </div>
                              
                              {request.revised_amount && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Revised Bid</p>
                                  <p className="text-lg font-bold text-blue-600">
                                    {formatEGP(request.revised_amount)}
                                  </p>
                                </div>
                              )}
                              
                              {order?.target_budget && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Your Budget</p>
                                  <p className="text-lg font-medium">
                                    {formatEGP(order.target_budget)}
                                  </p>
                                </div>
                              )}
                              
                              {bidComparison && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Comparison</p>
                                  <div className={`flex items-center gap-1 ${bidComparison.color}`}>
                                    <bidComparison.icon className="h-4 w-4" />
                                    <span className="font-medium">{bidComparison.text}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {request.bid_notes && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Lab's Notes</p>
                                <p className="text-sm">{request.bid_notes}</p>
                              </div>
                            )}

                            {request.revision_request_note && (
                              <div className="mt-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/20">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Your Revision Request:</p>
                                    <p className="text-sm text-orange-600 dark:text-orange-400">{request.revision_request_note}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Lab Profile Summary */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Rating</p>
                              <p className="font-semibold">
                                {lab?.performance_score?.toFixed(1) || 'N/A'}/5
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Turnaround</p>
                              <p className="font-semibold">
                                {order?.urgency === 'Urgent' 
                                  ? `${lab?.urgent_sla_days || 'N/A'} days`
                                  : `${lab?.standard_sla_days || 'N/A'} days`
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Capacity</p>
                              <p className="font-semibold">
                                {capacityPercentage < 80 ? 'Available' : 'High Load'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="font-semibold truncate">
                                {lab?.address?.split(',')[0] || 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedLab(lab);
                              setProfileDialogOpen(true);
                            }}
                            className="flex-1"
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            View Full Profile
                          </Button>
                          
                          {request.status === 'pending' && request.bid_status !== 'revision_requested' && (
                            <>
                              <Button
                                variant="default"
                                onClick={() => updateRequestStatus.mutate({ 
                                  requestId: request.id, 
                                  status: 'accepted',
                                  orderId: order?.id,
                                  orderNumber: order?.order_number,
                                  bidAmount: currentBidAmount
                                })}
                                disabled={updateRequestStatus.isPending}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Bid
                              </Button>
                              {request.bid_amount && (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRequestForRevision(request);
                                    setRevisionDialogOpen(true);
                                  }}
                                  className="flex-1"
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Request Revision
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                onClick={() => updateRequestStatus.mutate({ 
                                  requestId: request.id, 
                                  status: 'refused' 
                                })}
                                disabled={updateRequestStatus.isPending}
                                className="flex-1"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </>
                          )}

                          {request.bid_status === 'revision_requested' && (
                            <div className="flex-1 flex items-center justify-center py-2 px-4 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/20">
                              <Clock className="h-4 w-4 text-orange-500 mr-2" />
                              <span className="text-sm text-orange-700 dark:text-orange-300">Waiting for lab's revised bid...</span>
                            </div>
                          )}

                          {request.bid_status === 'revised' && request.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                onClick={() => updateRequestStatus.mutate({ 
                                  requestId: request.id, 
                                  status: 'accepted',
                                  orderId: order?.id,
                                  orderNumber: order?.order_number,
                                  bidAmount: request.revised_amount
                                })}
                                disabled={updateRequestStatus.isPending}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept Revised Bid
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequestForRevision(request);
                                  setRevisionDialogOpen(true);
                                }}
                                className="flex-1"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Request Again
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => updateRequestStatus.mutate({ 
                                  requestId: request.id, 
                                  status: 'refused' 
                                })}
                                disabled={updateRequestStatus.isPending}
                                className="flex-1"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                            </>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Applied: {new Date(request.created_at).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {/* Lab Profile Dialog */}
            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {selectedLab?.logo_url && (
                      <img 
                        src={selectedLab.logo_url} 
                        alt={selectedLab.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    {selectedLab?.name}
                  </DialogTitle>
                  <DialogDescription>
                    Complete lab profile and capabilities
                  </DialogDescription>
                </DialogHeader>
                
                {selectedLab && (
                  <div className="space-y-6">
                    {/* About */}
                    {selectedLab.description && (
                      <div>
                        <h4 className="font-semibold mb-2">About</h4>
                        <p className="text-sm text-muted-foreground">{selectedLab.description}</p>
                      </div>
                    )}
                    
                    {/* Key Metrics */}
                    <div>
                      <h4 className="font-semibold mb-3">Performance</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Star className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Performance Score</p>
                            <p className="font-semibold">{selectedLab.performance_score?.toFixed(1)}/5.0</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Clock className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Standard Turnaround</p>
                            <p className="font-semibold">{selectedLab.standard_sla_days} days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Urgent Turnaround</p>
                            <p className="font-semibold">{selectedLab.urgent_sla_days} days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Badge variant="outline" className="text-sm">
                            {selectedLab.pricing_tier}
                          </Badge>
                          <div>
                            <p className="text-xs text-muted-foreground">Pricing Tier</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div>
                      <h4 className="font-semibold mb-3">Contact Information</h4>
                      <div className="space-y-2">
                        {selectedLab.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-sm">{selectedLab.address}</p>
                          </div>
                        )}
                        {selectedLab.contact_email && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Email:</span>
                            <a href={`mailto:${selectedLab.contact_email}`} className="text-sm text-primary hover:underline">
                              {selectedLab.contact_email}
                            </a>
                          </div>
                        )}
                        {selectedLab.contact_phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <a href={`tel:${selectedLab.contact_phone}`} className="text-sm text-primary hover:underline">
                              {selectedLab.contact_phone}
                            </a>
                          </div>
                        )}
                        {selectedLab.website_url && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={selectedLab.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Capacity Status */}
                    <div>
                      <h4 className="font-semibold mb-3">Current Capacity</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Current Load: {selectedLab.current_load} / {selectedLab.max_capacity}</span>
                          <span>{((selectedLab.current_load / selectedLab.max_capacity) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              (selectedLab.current_load / selectedLab.max_capacity) > 0.8 
                                ? 'bg-destructive' 
                                : (selectedLab.current_load / selectedLab.max_capacity) > 0.5 
                                  ? 'bg-yellow-500' 
                                  : 'bg-success'
                            }`}
                            style={{ width: `${Math.min((selectedLab.current_load / selectedLab.max_capacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}
