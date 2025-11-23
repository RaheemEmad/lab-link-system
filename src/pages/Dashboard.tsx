import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Package, Compass, Truck } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
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
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [runTour, setRunTour] = useState(false);
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

  // Fetch user role (tour is now manual-only via "Start Tour" button)
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.role) {
        setUserRole(data.role);
      }
    };

    fetchUserRole();
  }, [user]);

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
        <FirstTimeModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
        <DashboardTour userRole={userRole} run={runTour} onComplete={() => setRunTour(false)} />
        <AchievementToast />
        <LandingNav />
        <TooltipProvider delayDuration={200}>
          <div className="flex-1 bg-secondary/30 py-6 sm:py-12">
            <div className="container px-4">
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold">Order Dashboard</h1>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setRunTour(true)}
                      className="relative group overflow-hidden bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40 transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Compass className="h-4 w-4 relative z-10 animate-pulse" />
                      <span className="ml-2 relative z-10 font-semibold">Start Tour</span>
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
                      onClick={() => navigate("/order-tracking")} 
                      className="flex-1 sm:flex-none"
                      data-tour="track-orders-btn"
                    >
                      <Package className="h-4 w-4" />
                      <span className="ml-2">Track Orders</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Real-time order tracking with delivery updates</p>
                  </TooltipContent>
                </Tooltip>

                {(userRole === "admin" || userRole === "lab_staff") && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate("/logistics")} 
                        className="flex-1 sm:flex-none"
                      >
                        <Truck className="h-4 w-4" />
                        <span className="ml-2">Logistics</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shipping tracking, handling instructions & lab capacity</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate("/notifications")} 
                      className="relative flex-1 sm:flex-none"
                      data-tour="notifications-btn"
                    >
                      <Bell className="h-4 w-4" />
                      <span className="ml-2">Notifications</span>
                      {unreadCount > 0 && <Badge variant={hasUrgent ? "destructive" : "default"} className={`absolute -top-1 -right-1 h-5 min-w-5 rounded-full flex items-center justify-center text-xs px-1.5 ${hasUrgent ? "animate-pulse" : ""}`}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {unreadCount > 0 ? `${hasUrgent ? "🔴 " : ""}You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}${hasUrgent ? " (urgent)" : ""}` : 'View notification history'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => navigate("/new-order")} 
                      className="flex-1 sm:flex-none"
                      data-tour="new-order-btn"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Order
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a new dental lab order</p>
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