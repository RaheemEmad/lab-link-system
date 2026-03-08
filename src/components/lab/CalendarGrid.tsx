import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CalendarOrder {
  id: string;
  order_number: string;
  patient_name: string;
  restoration_type: string;
  urgency: string;
  status: string;
  desired_delivery_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
}

interface CalendarGridProps {
  days: Date[];
  orders: CalendarOrder[];
  isLoading: boolean;
  viewMode: "week" | "month";
}

function getDeliveryDate(order: CalendarOrder): string | null {
  return order.desired_delivery_date || order.expected_delivery_date || null;
}

function getOrderColor(order: CalendarOrder, dayDate: Date): string {
  if (order.status === "Delivered") return "bg-muted-foreground/20 text-muted-foreground";
  if (order.urgency === "Urgent") return "bg-destructive/15 text-destructive border-destructive/30";
  const deliveryStr = getDeliveryDate(order);
  if (deliveryStr) {
    const deliveryDay = startOfDay(new Date(deliveryStr));
    const today = startOfDay(new Date());
    if (isBefore(deliveryDay, today)) return "bg-destructive/15 text-destructive border-destructive/30";
    if (isToday(deliveryDay)) return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700";
  }
  return "bg-primary/10 text-primary border-primary/20";
}

export const CalendarGrid = ({ days, orders, isLoading, viewMode }: CalendarGridProps) => {
  const navigate = useNavigate();

  const ordersByDay = useMemo(() => {
    const map: Record<string, CalendarOrder[]> = {};
    for (const order of orders) {
      const dateStr = getDeliveryDate(order);
      if (!dateStr) continue;
      const key = format(new Date(dateStr), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(order);
    }
    return map;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: viewMode === "week" ? 7 : 35 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayOrders = ordersByDay[key] ?? [];
          const todayClass = isToday(day);

          return (
            <Card
              key={key}
              className={cn(
                "min-h-[100px] sm:min-h-[120px] overflow-hidden",
                todayClass && "ring-2 ring-primary/50"
              )}
            >
              <CardContent className="p-1.5 sm:p-2">
                <div
                  className={cn(
                    "text-xs font-medium mb-1",
                    todayClass ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayOrders.slice(0, 3).map((order) => (
                    <button
                      key={order.id}
                      onClick={() => navigate(`/lab-order/${order.id}`)}
                      className={cn(
                        "w-full text-left text-[10px] sm:text-xs px-1.5 py-0.5 rounded border truncate transition-opacity hover:opacity-80",
                        getOrderColor(order, day)
                      )}
                      title={`#${order.order_number} - ${order.patient_name} (${order.restoration_type})`}
                    >
                      <span className="font-mono">#{order.order_number}</span>{" "}
                      <span className="hidden sm:inline">{order.patient_name}</span>
                    </button>
                  ))}
                  {dayOrders.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayOrders.length - 3} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
