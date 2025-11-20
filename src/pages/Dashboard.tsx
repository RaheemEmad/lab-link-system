import { useNavigate } from "react-router-dom";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Bell } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch unread notification count
  const { data: unreadCount } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-secondary/30 py-6 sm:py-12">
        <div className="container px-4">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => navigate("/notifications")}
                className="relative flex-1 sm:flex-none"
              >
                <Bell className="mr-2 h-4 w-4" />
                Notifications
                {unreadCount && unreadCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-2 px-2 py-0 h-5 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              
              <Button onClick={() => navigate("/new-order")} className="flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </div>
          </div>
          
          <OrderDashboard />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
