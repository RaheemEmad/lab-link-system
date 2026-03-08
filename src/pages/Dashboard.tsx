import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Package, Compass, Truck, Trophy, MessageSquareMore, FolderOpen } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { FirstTimeModal } from "@/components/onboarding/FirstTimeModal";
import { DashboardTour } from "@/components/dashboard/DashboardTour";
import { AchievementToast } from "@/components/dashboard/AchievementToast";
import { AchievementProgressNotification } from "@/components/dashboard/AchievementProgressNotification";
import { DashboardReceiveAnimation } from "@/components/order/DashboardReceiveAnimation";
import { PendingDeliveryConfirmations } from "@/components/order/PendingDeliveryConfirmations";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Overdue invoice banner component
const OverdueInvoiceBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: overdueCount } = useQuery({
    queryKey: ["overdue-invoices-count", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "overdue")
        .not("order.doctor_id", "is", null);
      // Since we can't filter by join in count, fetch and filter
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, order:orders!inner(doctor_id)")
        .eq("payment_status", "overdue");
      return invoices?.filter((inv: any) => inv.order?.doctor_id === user?.id).length || 0;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  if (!overdueCount || overdueCount === 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5 mb-4">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              You have {overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/logistics?tab=billing")} className="text-xs">
            View Billing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { role, isLabStaff, roleConfirmed, isLoading: roleLoading } = useUserRole();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showReceiveAnimation, setShowReceiveAnimation] = useState(false);
  const [receivedOrderNumber, setReceivedOrderNumber] = useState<string>("");
  
  // Use shared unread count hook - notifications are handled centrally by NotificationPopup
  const { unreadCount, hasUrgent } = useUnreadCount();

  // DEBUG: Log every render with current state
  console.debug('[Dashboard] Render:', {
    authLoading,
    roleLoading,
    roleConfirmed,
    userId: user?.id,
    role,
    isLabStaff,
    showCreateOrderButton: roleConfirmed && !isLabStaff,
    timestamp: new Date().toISOString()
  });

  // Check if this is first login and show onboarding modal
  useEffect(() => {
    const checkFirstLogin = async () => {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, created_at")
        .eq("id", user.id)
        .single();

      // Show onboarding if completed recently (within 5 minutes)
      if (profile?.onboarding_completed) {
        const createdAt = new Date(profile.created_at).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - createdAt < fiveMinutes) {
          const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${user.id}`);
          if (!hasSeenOnboarding) {
            setShowOnboarding(true);
            localStorage.setItem(`onboarding_seen_${user.id}`, "true");
          }
        }
      }
    };

    checkFirstLogin();
  }, [user]);

  // Check if we're receiving a newly accepted order
  useEffect(() => {
    if (location.state?.newOrderAccepted && location.state?.orderNumber) {
      setReceivedOrderNumber(location.state.orderNumber);
      setShowReceiveAnimation(true);
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // CRITICAL: Prevent rendering role-conditional UI until role is fully loaded
  if (roleLoading) {
    console.debug('[Dashboard] Showing loading state - role not yet loaded');
    return <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    </ProtectedRoute>;
  }

  return <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        {showReceiveAnimation && (
          <DashboardReceiveAnimation
            orderNumber={receivedOrderNumber}
            onComplete={() => setShowReceiveAnimation(false)}
          />
        )}
        
        <FirstTimeModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
        <DashboardTour userRole={role || ""} run={runTour} onComplete={() => setRunTour(false)} />
        <AchievementToast />
        <AchievementProgressNotification />
        <LandingNav />
        <TooltipProvider delayDuration={200}>
          <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
            <div className="container px-3 sm:px-4 lg:px-6">
              <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Order Dashboard</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {isLabStaff ? "Lab View" : "Doctor View"}
                  </p>
                </div>
              
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setRunTour(true)}
                      className="w-full sm:w-auto min-h-[44px] sm:min-h-0 press-feedback"
                    >
                      <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Tour</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Take an interactive tour of the dashboard features</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/logistics")} 
                      className="w-full sm:w-auto min-h-[44px] sm:min-h-0 press-feedback"
                      data-tour="track-orders-btn"
                    >
                      <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Logistics</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Shipments, tracking, calendar, analytics & billing</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/feedback-room")} 
                      className="w-full sm:w-auto min-h-[44px] sm:min-h-0 press-feedback"
                    >
                      <MessageSquareMore className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Feedback Room</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Collaborate with lab on order details and quality</p>
                  </TooltipContent>
                </Tooltip>

                {roleConfirmed && !isLabStaff && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate("/patient-cases")}
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 press-feedback"
                        >
                          <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Cases</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View patient case library and reorder</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate("/new-order")}
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 press-feedback"
                          data-tour="new-order-btn"
                        >
                          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Create Order</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Create a new dental lab order</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
            
            {/* Overdue Invoice Banner for Doctors */}
            {roleConfirmed && !isLabStaff && (
              <OverdueInvoiceBanner />
            )}

            {/* Show pending delivery confirmations for doctors */}
            {roleConfirmed && !isLabStaff && (
              <PendingDeliveryConfirmations />
            )}
            
            <OrderDashboard />
        </div>
      </div>
      </TooltipProvider>
      <LandingFooter />
      <ScrollToTop />
    </div>
    </ProtectedRoute>;
};
export default Dashboard;