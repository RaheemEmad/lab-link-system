import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarGrid } from "@/components/lab/CalendarGrid";
import { AvailabilityManager } from "@/components/lab/AvailabilityManager";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Building2 } from "lucide-react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, addMonths, subWeeks, subMonths, format, eachDayOfInterval,
} from "date-fns";

type ViewMode = "week" | "month";

export const CalendarTabContent = () => {
  const { labId, isLabStaff, isAdmin } = useUserRole();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  const dateRange = useMemo(() => {
    if (viewMode === "week") {
      return { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };
    }
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  }, [currentDate, viewMode]);

  const days = useMemo(() => eachDayOfInterval({ start: dateRange.start, end: dateRange.end }), [dateRange]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["lab-calendar-orders", labId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const startStr = format(dateRange.start, "yyyy-MM-dd");
      const endStr = format(dateRange.end, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, patient_name, restoration_type, urgency, status, desired_delivery_date, expected_delivery_date, actual_delivery_date")
        .eq("assigned_lab_id", labId!)
        .or(`desired_delivery_date.gte.${startStr},expected_delivery_date.gte.${startStr}`)
        .or(`desired_delivery_date.lte.${endStr},expected_delivery_date.lte.${endStr}`)
        .not("status", "eq", "Cancelled");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!labId,
    staleTime: 30_000,
  });

  const navigateDate = (dir: "prev" | "next") => {
    if (viewMode === "week") setCurrentDate((d) => (dir === "prev" ? subWeeks(d, 1) : addWeeks(d, 1)));
    else setCurrentDate((d) => (dir === "prev" ? subMonths(d, 1) : addMonths(d, 1)));
  };

  if (!isLabStaff && !isAdmin) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Lab Access Only</h2>
          <p className="text-muted-foreground">This feature is for lab staff.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" /> Lab Calendar
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Order deadlines and delivery schedule</p>
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")} className="rounded-none">Week</Button>
          <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")} className="rounded-none">Month</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <h2 className="font-semibold text-lg">
              {viewMode === "week" ? `${format(dateRange.start, "MMM d")} – ${format(dateRange.end, "MMM d, yyyy")}` : format(currentDate, "MMMM yyyy")}
            </h2>
            <Button variant="link" size="sm" className="text-xs text-muted-foreground p-0 h-auto" onClick={() => setCurrentDate(new Date())}>Today</Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateDate("next")}><ChevronRight className="h-4 w-4" /></Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Overdue / Urgent</Badge>
        <Badge variant="outline" className="gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Due Today</Badge>
        <Badge variant="outline" className="gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> On Track</Badge>
        <Badge variant="outline" className="gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Delivered</Badge>
      </div>

      <CalendarGrid days={days} orders={orders} isLoading={isLoading} viewMode={viewMode} />

      <div className="mt-8">
        <AvailabilityManager />
      </div>
    </div>
  );
};
