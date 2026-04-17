import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, MessageSquare, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  labId: string;
}

export function LabAggregateStatsCard({ labId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["lab-aggregate-stats", labId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lab_aggregate_stats", { p_lab_id: labId });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!labId,
  });

  if (isLoading) {
    return <Skeleton className="h-28 w-full" />;
  }
  if (!data || !data.total_reviews) return null;

  const stats = [
    {
      icon: Star,
      label: "Overall",
      value: data.avg_overall ? Number(data.avg_overall).toFixed(1) : "—",
      suffix: "★",
    },
    {
      icon: Award,
      label: "Quality",
      value: data.avg_quality ? Number(data.avg_quality).toFixed(1) : "—",
      suffix: "★",
    },
    {
      icon: Clock,
      label: "On-Time",
      value: data.on_time_percentage ? Number(data.on_time_percentage).toFixed(0) : "0",
      suffix: "%",
    },
    {
      icon: MessageSquare,
      label: "Reviews",
      value: String(data.total_reviews ?? 0),
      suffix: "",
    },
  ];

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">
                {s.value}
                <span className="text-base text-muted-foreground ml-0.5">{s.suffix}</span>
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
