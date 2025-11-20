import { useNavigate } from "react-router-dom";
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
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();

  // Fetch unread notification count
  const {
    data: unreadCount
  } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const {
        count,
        error
      } = await supabase.from("notifications").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", user.id).eq("read", false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
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
                    
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {unreadCount && unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'View notification history'}
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