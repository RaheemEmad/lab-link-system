import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Target,
  Package
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LabPerformanceStatsProps {
  labId: string;
}

export function LabPerformanceStats({ labId }: LabPerformanceStatsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["lab-performance-metrics", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_performance_metrics")
        .select("*")
        .eq("lab_id", labId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No performance data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = metrics.total_orders > 0 
    ? ((metrics.completed_orders / metrics.total_orders) * 100).toFixed(1)
    : "0";

  const onTimeRate = metrics.completed_orders > 0
    ? ((metrics.on_time_deliveries / metrics.completed_orders) * 100).toFixed(1)
    : "100";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Orders */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Orders</span>
          </div>
          <span className="font-semibold">{metrics.total_orders}</span>
        </div>

        {/* Completion Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Completion Rate</span>
            </div>
            <span className="font-semibold text-green-600">{completionRate}%</span>
          </div>
          <Progress value={parseFloat(completionRate)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.completed_orders} of {metrics.total_orders} orders completed
          </p>
        </div>

        {/* On-Time Delivery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">On-Time Delivery</span>
            </div>
            <span className="font-semibold text-blue-600">{onTimeRate}%</span>
          </div>
          <Progress value={parseFloat(onTimeRate)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.on_time_deliveries} orders delivered on or before expected date
          </p>
        </div>

        {/* Average Lead Time */}
        {metrics.average_lead_time_hours !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Lead Time</span>
            </div>
            <span className="font-semibold">
              {metrics.average_lead_time_hours < 24
                ? `${Math.round(metrics.average_lead_time_hours)} hours`
                : `${Math.round(metrics.average_lead_time_hours / 24)} days`}
            </span>
          </div>
        )}

        {/* Cancellation Rate (if visible) */}
        {(metrics.cancellation_rate !== null && metrics.cancellation_rate > 0) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Cancellation Rate</span>
            </div>
            <span className={`font-semibold ${metrics.cancellation_rate > 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {Number(metrics.cancellation_rate).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Last Updated */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date(metrics.last_calculated_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}