import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Package, Activity, MessageSquare, BarChart3 } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import AdminDashboardTab from "@/components/admin/AdminDashboardTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminActivityTab from "@/components/admin/AdminActivityTab";
import AdminCommunicationTab from "@/components/admin/AdminCommunicationTab";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (data?.role !== "admin") {
          toast.error("Access denied", {
            description: "You don't have admin privileges"
          });
          navigate("/dashboard");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin access:", error);
        toast.error("Access denied");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-secondary/30 py-8">
        <div className="container px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Admin Panel</h1>
            </div>
            <p className="text-muted-foreground">
              Manage users, orders, and monitor all system activities
            </p>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="communication" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Communication</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <AdminDashboardTab />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <AdminUsersTab />
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <AdminOrdersTab />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <AdminActivityTab />
            </TabsContent>

            <TabsContent value="communication" className="mt-6">
              <AdminCommunicationTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

export default Admin;
