import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Lazy load admin components
const AdminDashboardTab = lazy(() => import("@/components/admin/AdminDashboardTab"));
const AdminUsersTab = lazy(() => import("@/components/admin/AdminUsersTab"));
const AdminOrdersTab = lazy(() => import("@/components/admin/AdminOrdersTab"));
const AdminActivityTab = lazy(() => import("@/components/admin/AdminActivityTab"));
const AdminCommunicationTab = lazy(() => import("@/components/admin/AdminCommunicationTab"));
const AdminAnalyticsTab = lazy(() => import("@/components/admin/AdminAnalyticsTab"));
const AdminSecurityTab = lazy(() => import("@/components/admin/AdminSecurityTab"));

const TabLoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin/login");
        return;
      }

      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error || !roleData) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "dashboard") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger and back button */}
          <header className="sticky top-0 z-10 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full items-center gap-4 px-6">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-semibold">Admin Panel</h1>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="hidden">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="communication">Communication</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <AdminDashboardTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="users" className="space-y-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <AdminUsersTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <AdminOrdersTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <AdminActivityTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="communication" className="space-y-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <AdminCommunicationTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <AdminAnalyticsTab />
                </Suspense>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Suspense fallback={<TabLoadingFallback />}>
                  <AdminSecurityTab />
                </Suspense>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
