import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Info, AlertCircle, XCircle, CheckCircle, TrendingUp, Activity } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { slaMonitor } from "@/lib/slaMonitor";
import { autoScalingManager } from "@/lib/autoScalingPolicies";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  category: string;
  metadata: any;
  read: boolean;
  created_at: string;
}

const AdminAlertsTab = () => {
  const [alerts, setAlerts] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'rate_limiting' | 'performance' | 'auto_scaling'>('all');

  useEffect(() => {
    fetchAlerts();
    setupRealtimeSubscription();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .in("category", ["rate_limiting", "performance", "auto_scaling"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setAlerts(data as AdminNotification[] || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("admin-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: "category=in.(rate_limiting,performance,auto_scaling)"
        },
        (payload) => {
          const newAlert = payload.new as AdminNotification;
          setAlerts((prev) => [newAlert, ...prev]);
          
          // Show toast for critical alerts
          if (newAlert.severity === "critical") {
            toast.error(newAlert.title, {
              description: newAlert.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;

      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true } : a))
      );
      toast.success("Alert marked as resolved");
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error("Failed to resolve alert");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-4 border-destructive bg-destructive/5";
      case "error":
        return "border-l-4 border-destructive bg-destructive/5";
      case "warning":
        return "border-l-4 border-warning bg-warning/5";
      default:
        return "border-l-4 border-info bg-info/5";
    }
  };

  const filteredAlerts = alerts.filter(alert => 
    filter === 'all' || alert.category === filter
  );

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical' && !a.read).length,
    warning: alerts.filter(a => a.severity === 'warning' && !a.read).length,
    resolved: alerts.filter(a => a.read).length,
  };

  const thresholds = slaMonitor.getThresholds();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Alerts & Monitoring</h2>
        <p className="text-muted-foreground">
          Real-time alerts for rate limiting, performance, and auto-scaling events
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.warning}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SLA Thresholds
          </CardTitle>
          <CardDescription>Current performance monitoring thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Response Time</p>
              <p className="text-xs text-muted-foreground">Warning: {thresholds.responseTime.warning}ms</p>
              <p className="text-xs text-muted-foreground">Critical: {thresholds.responseTime.critical}ms</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Error Rate</p>
              <p className="text-xs text-muted-foreground">Warning: {thresholds.errorRate.warning}%</p>
              <p className="text-xs text-muted-foreground">Critical: {thresholds.errorRate.critical}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Query Time</p>
              <p className="text-xs text-muted-foreground">Warning: {thresholds.queryTime.warning}ms</p>
              <p className="text-xs text-muted-foreground">Critical: {thresholds.queryTime.critical}ms</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Memory Usage</p>
              <p className="text-xs text-muted-foreground">Warning: {thresholds.memoryUsage.warning}%</p>
              <p className="text-xs text-muted-foreground">Critical: {thresholds.memoryUsage.critical}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>Recent system alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All Alerts</TabsTrigger>
              <TabsTrigger value="rate_limiting">Rate Limiting</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="auto_scaling">Auto-Scaling</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              <ScrollArea className="h-[600px]">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No alerts found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                      <Card key={alert.id} className={getSeverityColor(alert.severity)}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {getSeverityIcon(alert.severity)}
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{alert.title}</p>
                                  {!alert.read && (
                                    <Badge variant="default">New</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {alert.message}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline">{alert.category}</Badge>
                                  <Badge variant="secondary">{alert.severity}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(alert.created_at), "MMM dd, yyyy HH:mm:ss")}
                                  </span>
                                </div>
                                {alert.metadata && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-muted-foreground cursor-pointer">
                                      View details
                                    </summary>
                                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(alert.metadata, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                            {!alert.read && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAsResolved(alert.id)}
                              >
                                Mark Resolved
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAlertsTab;
