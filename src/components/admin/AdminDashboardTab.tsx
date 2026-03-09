import { memo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, TrendingUp, Activity, CheckCircle2, Clock } from "lucide-react";

// Lazy load chart components for better bundle splitting
const ChartComponents = lazy(() => import("./charts/AdminCharts"));

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  ordersByDay: Array<{ date: string; count: number }>;
  roleDistribution: Array<{ role: string; count: number }>;
}

// Memoized stats cards component
const StatsCards = memo(({ stats }: { stats: Stats }) => (
  <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="text-xl md:text-2xl font-bold">{stats.totalUsers}</div>
        <p className="text-xs text-muted-foreground">
          {stats.activeUsers} active users
        </p>
      </CardContent>
    </Card>

    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="text-xl md:text-2xl font-bold">{stats.totalOrders}</div>
        <p className="text-xs text-muted-foreground">All time orders</p>
      </CardContent>
    </Card>

    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="text-xl md:text-2xl font-bold">{stats.pendingOrders}</div>
        <p className="text-xs text-muted-foreground">Awaiting processing</p>
      </CardContent>
    </Card>

    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
        <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="text-xl md:text-2xl font-bold">{stats.completedOrders}</div>
        <p className="text-xs text-muted-foreground">Successfully delivered</p>
      </CardContent>
    </Card>
  </div>
));

StatsCards.displayName = "StatsCards";

const defaultStats: Stats = {
  totalUsers: 0,
  activeUsers: 0,
  totalOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  ordersByStatus: [],
  ordersByDay: [],
  roleDistribution: [],
};

const AdminDashboardTab = () => {
  const { data: stats = defaultStats, isLoading: loading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_stats" as any);
      if (error) throw error;

      const raw = data as any;
      return {
        totalUsers: raw.totalUsers ?? 0,
        activeUsers: raw.activeUsers ?? 0,
        totalOrders: raw.totalOrders ?? 0,
        pendingOrders: raw.pendingOrders ?? 0,
        completedOrders: raw.completedOrders ?? 0,
        ordersByStatus: raw.ordersByStatus ?? [],
        ordersByDay: raw.ordersByDay ?? [],
        roleDistribution: raw.roleDistribution ?? [],
      } as Stats;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    meta: { errorMessage: "Failed to load dashboard statistics" },
  });

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <StatsCards stats={stats} />

      {/* Charts - Lazy loaded for better performance */}
      <Suspense fallback={
        <div className="flex justify-center p-6 md:p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <ChartComponents 
          ordersByStatus={stats.ordersByStatus}
          roleDistribution={stats.roleDistribution}
          ordersByDay={stats.ordersByDay}
        />
      </Suspense>

      {/* System Health */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">System Health</CardTitle>
          <CardDescription className="text-sm">Current system status and metrics</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-green-500 shrink-0" />
                <span className="font-medium text-sm md:text-base">Database</span>
              </div>
              <span className="text-xs md:text-sm text-green-500 shrink-0">Operational</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 md:h-5 md:w-5 text-green-500 shrink-0" />
                <span className="font-medium text-sm md:text-base">Authentication</span>
              </div>
              <span className="text-xs md:text-sm text-green-500 shrink-0">Operational</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-500 shrink-0" />
                <span className="font-medium text-sm md:text-base">User Engagement</span>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground shrink-0">
                {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% activation rate
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardTab;
