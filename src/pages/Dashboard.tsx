import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Package, Compass, Truck, Trophy } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { FirstTimeModal } from "@/components/onboarding/FirstTimeModal";
import { DashboardTour } from "@/components/dashboard/DashboardTour";
import { AchievementToast } from "@/components/dashboard/AchievementToast";
import { AchievementProgressNotification } from "@/components/dashboard/AchievementProgressNotification";
import { DashboardReceiveAnimation } from "@/components/order/DashboardReceiveAnimation";
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { role, isLabStaff } = useUserRole();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showReceiveAnimation, setShowReceiveAnimation] = useState(false);
  const [receivedOrderNumber, setReceivedOrderNumber] = useState<string>("");
  const [showCreateOrderPulse, setShowCreateOrderPulse] = useState(false);
  const { playUrgentNotification } = useNotificationSound();
  const { 
    requestPermission, 
    showUrgentNotification, 
    showNormalNotification,
    isGranted,
    isSupported 
  } = useBrowserNotifications();
  const previousUrgentCountRef = useRef<number>(0);
  const previousTotalCountRef = useRef<number>(0);

  // Fetch unread notification count and check for urgent notifications
  const { data: notificationData } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0, hasUrgent: false };

      const { data, error } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      
      // Check if any notification is of urgent type (status_change or urgent types)
      const hasUrgent = data?.some(n => 
        n.type === "status_change" || n.type === "urgent"
      ) || false;

      return { count: data?.length || 0, hasUrgent };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notificationData?.count || 0;
  const hasUrgent = notificationData?.hasUrgent || false;

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

  // Show pulse animation for Create Order button on first page load
  useEffect(() => {
    const hasSeenCreateOrderPulse = localStorage.getItem('create_order_pulse_seen');
    if (!hasSeenCreateOrderPulse) {
      const timer = setTimeout(() => {
        setShowCreateOrderPulse(true);
        localStorage.setItem('create_order_pulse_seen', 'true');
        // Stop pulse after 5 seconds
        setTimeout(() => setShowCreateOrderPulse(false), 5000);
      }, 1000); // Delay 1s after page load
      return () => clearTimeout(timer);
    }
  }, []);

  // Check if we're receiving a newly accepted order
  useEffect(() => {
    if (location.state?.newOrderAccepted && location.state?.orderNumber) {
      setReceivedOrderNumber(location.state.orderNumber);
      setShowReceiveAnimation(true);
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Request notification permission on mount if user is logged in
  useEffect(() => {
    if (user && isSupported && !isGranted) {
      // Delay the request slightly to avoid disrupting the user experience
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, isGranted, requestPermission]);

  // Play sound and show browser notification when new urgent notifications arrive
  useEffect(() => {
    const isNewUrgent = hasUrgent && unreadCount > previousUrgentCountRef.current && previousUrgentCountRef.current > 0;
    const isNewNotification = unreadCount > previousTotalCountRef.current && previousTotalCountRef.current > 0;

    if (isNewUrgent) {
      playUrgentNotification();
      showUrgentNotification(unreadCount);
      console.log('🔔 Urgent notification: sound + desktop notification');
    } else if (isNewNotification) {
      showNormalNotification(unreadCount);
      console.log('📬 Normal notification: desktop notification');
    }

    previousUrgentCountRef.current = unreadCount;
    previousTotalCountRef.current = unreadCount;
  }, [unreadCount, hasUrgent, playUrgentNotification, showUrgentNotification, showNormalNotification]);

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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Order Dashboard</h1>
              
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setRunTour(true)}
                      className="relative group overflow-hidden bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40 transition-all duration-300 w-full sm:w-auto"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4 relative z-10 animate-pulse" />
                      <span className="ml-1.5 sm:ml-2 relative z-10 font-semibold text-xs sm:text-sm">Tour</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Take an interactive tour of the dashboard features</p>
                  </TooltipContent>
                </Tooltip>

                {!isLabStaff && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="default" 
                        onClick={() => navigate("/new-order")}
                        className={`relative group overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-accent hover:from-primary/95 hover:via-primary/85 hover:to-accent/95 text-primary-foreground transition-all duration-300 w-full sm:w-auto shadow-md hover:shadow-xl border-0 ${showCreateOrderPulse ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`}
                        data-tour="new-order-btn"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-[shimmer_3s_ease-in-out_infinite]" />
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="ml-2 relative z-10 font-bold text-sm sm:text-base">Create Order</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create a new dental lab order</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <div className="hidden sm:block w-px h-8 bg-border/50" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/track-orders")} 
                      className="w-full sm:w-auto"
                      data-tour="track-orders-btn"
                    >
                      <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Track</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Monitor your orders with shipment details and tracking</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/logistics")} 
                      className="w-full sm:w-auto"
                    >
                      <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Logistics</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manage shipment details and delivery coordination</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            
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