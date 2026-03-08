import { Card, CardContent } from "@/components/ui/card";
import { Activity, AlertTriangle, Clock, CheckCircle2, Package, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPIFilter {
  key: string;
  status?: string;
  urgency?: string;
}

interface KPIProps {
  orders: Array<{ status: string; urgency: string; timestamp: string }>;
  isLabStaff: boolean;
  activeFilter?: string | null;
  onFilterChange?: (filter: KPIFilter | null) => void;
}

export const DashboardKPICards = ({ orders, isLabStaff, activeFilter, onFilterChange }: KPIProps) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeOrders = orders.filter(o => !["Delivered", "Cancelled"].includes(o.status));
  const urgentOrders = orders.filter(o => o.urgency === "Urgent" && !["Delivered", "Cancelled"].includes(o.status));
  const deliveredThisMonth = orders.filter(o => o.status === "Delivered" && new Date(o.timestamp) >= monthStart);

  const cards = isLabStaff
    ? [
        { key: "active", label: "Queue Size", value: activeOrders.length, icon: Package, color: "text-primary", filter: { key: "active", status: "active" } as KPIFilter },
        { key: "urgent", label: "Urgent", value: urgentOrders.length, icon: Zap, color: "text-destructive", filter: { key: "urgent", urgency: "Urgent" } as KPIFilter },
        { key: "qc", label: "Ready for QC", value: orders.filter(o => o.status === "Ready for QC").length, icon: Clock, color: "text-warning", filter: { key: "qc", status: "Ready for QC" } as KPIFilter },
        { key: "delivered", label: "Completed This Month", value: deliveredThisMonth.length, icon: CheckCircle2, color: "text-success", filter: { key: "delivered", status: "Delivered" } as KPIFilter },
      ]
    : [
        { key: "active", label: "Total Active", value: activeOrders.length, icon: Activity, color: "text-primary", filter: { key: "active", status: "active" } as KPIFilter },
        { key: "urgent", label: "Urgent Orders", value: urgentOrders.length, icon: AlertTriangle, color: "text-destructive", filter: { key: "urgent", urgency: "Urgent" } as KPIFilter },
        { key: "delivery", label: "Awaiting Delivery", value: orders.filter(o => o.status === "Ready for Delivery").length, icon: Package, color: "text-warning", filter: { key: "delivery", status: "Ready for Delivery" } as KPIFilter },
        { key: "delivered", label: "Delivered This Month", value: deliveredThisMonth.length, icon: CheckCircle2, color: "text-success", filter: { key: "delivered", status: "Delivered" } as KPIFilter },
      ];

  const handleClick = (card: typeof cards[0]) => {
    if (!onFilterChange) return;
    if (activeFilter === card.key) {
      onFilterChange(null);
    } else {
      onFilterChange(card.filter);
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        return (
          <Card
            key={card.label}
            className={cn(
              "border-border/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02]",
              isActive && "ring-2 ring-primary border-primary/50 shadow-md"
            )}
            onClick={() => handleClick(card)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-muted", card.color)}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
