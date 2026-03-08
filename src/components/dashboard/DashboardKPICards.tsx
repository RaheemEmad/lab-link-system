import { Card, CardContent } from "@/components/ui/card";
import { Activity, AlertTriangle, Clock, CheckCircle2, Package, Zap } from "lucide-react";

interface KPIProps {
  orders: Array<{ status: string; urgency: string; timestamp: string }>;
  isLabStaff: boolean;
}

export const DashboardKPICards = ({ orders, isLabStaff }: KPIProps) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeOrders = orders.filter(o => !["Delivered", "Cancelled"].includes(o.status));
  const urgentOrders = orders.filter(o => o.urgency === "Urgent" && !["Delivered", "Cancelled"].includes(o.status));
  const deliveredThisMonth = orders.filter(o => o.status === "Delivered" && new Date(o.timestamp) >= monthStart);

  const cards = isLabStaff
    ? [
        { label: "Queue Size", value: activeOrders.length, icon: Package, color: "text-primary" },
        { label: "Urgent", value: urgentOrders.length, icon: Zap, color: "text-destructive" },
        { label: "Ready for QC", value: orders.filter(o => o.status === "Ready for QC").length, icon: Clock, color: "text-warning" },
        { label: "Completed This Month", value: deliveredThisMonth.length, icon: CheckCircle2, color: "text-success" },
      ]
    : [
        { label: "Total Active", value: activeOrders.length, icon: Activity, color: "text-primary" },
        { label: "Urgent Orders", value: urgentOrders.length, icon: AlertTriangle, color: "text-destructive" },
        { label: "Awaiting Delivery", value: orders.filter(o => o.status === "Ready for Delivery").length, icon: Package, color: "text-warning" },
        { label: "Delivered This Month", value: deliveredThisMonth.length, icon: CheckCircle2, color: "text-success" },
      ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
