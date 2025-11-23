import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown, Users, Package } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface DateRange {
  from: Date;
  to: Date;
}

interface Analytics {
  orders: { date: string; count: number }[];
  users: { date: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  orderTrends: { date: string; total: number; completed: number; pending: number }[];
}

const AdminAnalyticsTab = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [comparisonRange, setComparisonRange] = useState<DateRange>({
    from: subDays(new Date(), 60),
    to: subDays(new Date(), 30),
  });
  const [analytics, setAnalytics] = useState<Analytics>({
    orders: [],
    users: [],
    statusDistribution: [],
    orderTrends: [],
  });
  const [comparison, setComparison] = useState<Analytics>({
    orders: [],
    users: [],
    statusDistribution: [],
    orderTrends: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, comparisonRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch orders for current period
      const { data: currentOrders, error: ordersError } = await supabase
        .from("orders")
        .select("created_at, status")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      if (ordersError) throw ordersError;

      // Fetch orders for comparison period
      const { data: comparisonOrders, error: compOrdersError } = await supabase
        .from("orders")
        .select("created_at, status")
        .gte("created_at", comparisonRange.from.toISOString())
        .lte("created_at", comparisonRange.to.toISOString());

      if (compOrdersError) throw compOrdersError;

      // Fetch users for current period
      const { data: currentUsers, error: usersError } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      if (usersError) throw usersError;

      // Fetch users for comparison period
      const { data: comparisonUsers, error: compUsersError } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", comparisonRange.from.toISOString())
        .lte("created_at", comparisonRange.to.toISOString());

      if (compUsersError) throw compUsersError;

      // Process data for current period
      setAnalytics(processAnalyticsData(currentOrders || [], currentUsers || []));
      
      // Process data for comparison period
      setComparison(processAnalyticsData(comparisonOrders || [], comparisonUsers || []));
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (orders: any[], users: any[]): Analytics => {
    // Group orders by date
    const ordersByDate = orders.reduce((acc, order) => {
      const date = format(new Date(order.created_at), "yyyy-MM-dd");
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group users by date
    const usersByDate = users.reduce((acc, user) => {
      const date = format(new Date(user.created_at), "yyyy-MM-dd");
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Status distribution
    const statusDist = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Order trends by status
    const trendsByDate = orders.reduce((acc, order) => {
      const date = format(new Date(order.created_at), "yyyy-MM-dd");
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0, pending: 0 };
      }
      acc[date].total += 1;
      if (order.status === "Delivered") acc[date].completed += 1;
      if (order.status === "Pending") acc[date].pending += 1;
      return acc;
    }, {} as Record<string, { total: number; completed: number; pending: number }>);

    return {
      orders: Object.entries(ordersByDate).map(([date, count]) => ({ date, count: count as number })),
      users: Object.entries(usersByDate).map(([date, count]) => ({ date, count: count as number })),
      statusDistribution: Object.entries(statusDist).map(([status, count]) => ({ status, count: count as number })),
      orderTrends: Object.entries(trendsByDate).map(([date, data]) => {
        const trendData = data as { total: number; completed: number; pending: number };
        return { date, total: trendData.total, completed: trendData.completed, pending: trendData.pending };
      }),
    };
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const currentTotal = analytics.orders.reduce((sum, o) => sum + o.count, 0);
  const previousTotal = comparison.orders.reduce((sum, o) => sum + o.count, 0);
  const orderGrowth = calculateGrowth(currentTotal, previousTotal);

  const currentUsers = analytics.users.reduce((sum, u) => sum + u.count, 0);
  const previousUsers = comparison.users.reduce((sum, u) => sum + u.count, 0);
  const userGrowth = calculateGrowth(currentUsers, previousUsers);

  const setPresetRange = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "7days":
        setDateRange({ from: subDays(now, 7), to: now });
        setComparisonRange({ from: subDays(now, 14), to: subDays(now, 7) });
        break;
      case "30days":
        setDateRange({ from: subDays(now, 30), to: now });
        setComparisonRange({ from: subDays(now, 60), to: subDays(now, 30) });
        break;
      case "thisMonth":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        setComparisonRange({ from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) });
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        setComparisonRange({ from: startOfMonth(subMonths(now, 2)), to: endOfMonth(subMonths(now, 2)) });
        break;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Analytics</CardTitle>
          <CardDescription>
            Comprehensive insights with comparison and trend analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPresetRange("7days")}>
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetRange("30days")}>
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetRange("thisMonth")}>
              This Month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetRange("lastMonth")}>
              Last Month
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Current: {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Compare: {format(comparisonRange.from, "PPP")} - {format(comparisonRange.to, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: comparisonRange.from, to: comparisonRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setComparisonRange({ from: range.from, to: range.to });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentTotal}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {orderGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
              )}
              <span className={orderGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(orderGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period ({previousTotal})</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {userGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
              )}
              <span className={userGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(userGrowth).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period ({previousUsers})</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Trends</CardTitle>
          <CardDescription>Daily order volume and completion status</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.orderTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" name="Total Orders" />
              <Line type="monotone" dataKey="completed" stroke="hsl(var(--chart-2))" name="Completed" />
              <Line type="monotone" dataKey="pending" stroke="hsl(var(--chart-3))" name="Pending" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Status Distribution</CardTitle>
          <CardDescription>Breakdown of orders by status</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Growth Trend</CardTitle>
          <CardDescription>New user registrations over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.users}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" name="New Users" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsTab;
