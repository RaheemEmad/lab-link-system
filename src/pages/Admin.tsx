import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Package, Activity, MessageSquare, BarChart3, TrendingUp } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import AdminNotifications from "@/components/admin/AdminNotifications";

// Lazy load admin components for better performance
const AdminDashboardTab = lazy(() => import("@/components/admin/AdminDashboardTab"));
const AdminUsersTab = lazy(() => import("@/components/admin/AdminUsersTab"));
const AdminOrdersTab = lazy(() => import("@/components/admin/AdminOrdersTab"));
const AdminActivityTab = lazy(() => import("@/components/admin/AdminActivityTab"));
const AdminCommunicationTab = lazy(() => import("@/components/admin/AdminCommunicationTab"));
const AdminAnalyticsTab = lazy(() => import("@/components/admin/AdminAnalyticsTab"));

// Loading fallback component
const TabLoadingFallback = () => (
  <Card>
    <CardContent className="p-8">
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </CardContent>
  </Card>
);

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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Admin Panel</h1>
              </div>
              <AdminNotifications />
            </div>
            <p className="text-muted-foreground">
              Manage users, orders, and monitor all system activities
            </p>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
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
              <Suspense fallback={<TabLoadingFallback />}>
                <AdminDashboardTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <Suspense fallback={<TabLoadingFallback />}>
                <AdminAnalyticsTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Suspense fallback={<TabLoadingFallback />}>
                <AdminUsersTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <Suspense fallback={<TabLoadingFallback />}>
                <AdminOrdersTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Suspense fallback={<TabLoadingFallback />}>
                <AdminActivityTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="communication" className="mt-6">
              <Suspense fallback={<TabLoadingFallback />}>
                <AdminCommunicationTab />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

export default Admin;
