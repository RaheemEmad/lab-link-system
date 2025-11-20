import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotificationSound } from "@/hooks/useNotificationSound";
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playUrgentNotification } = useNotificationSound();
  const previousUrgentCountRef = useRef<number>(0);

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

  // Play sound when new urgent notifications arrive
  useEffect(() => {
    if (hasUrgent && unreadCount > previousUrgentCountRef.current && previousUrgentCountRef.current > 0) {
      playUrgentNotification();
      console.log('🔔 Urgent notification sound played on Dashboard');
    }
    previousUrgentCountRef.current = unreadCount;
  }, [unreadCount, hasUrgent, playUrgentNotification]);

  return <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <TooltipProvider delayDuration={200}>
          <div className="flex-1 bg-secondary/30 py-6 sm:py-12">
            <div className="container px-4">
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold">Order Dashboard</h1>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/notifications")} className="relative flex-1 sm:flex-none">
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
                    <Button onClick={() => navigate("/new-order")} className="flex-1 sm:flex-none">
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