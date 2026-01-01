import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Truck, Package, Sparkles, Timer } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type UrgencyLevel = Database["public"]["Enums"]["urgency_level"];

interface OrderStatusBadgeProps {
  status: OrderStatus;
  urgency?: UrgencyLevel;
  showIcon?: boolean;
  className?: string;
  deliveryPendingConfirmation?: boolean;
}

const statusConfig = {
  Pending: {
    variant: "pending" as const,
    icon: Clock,
    label: "Pending",
  },
  "In Progress": {
    variant: "in-progress" as const,
    icon: Sparkles,
    label: "In Progress",
  },
  "Ready for QC": {
    variant: "ready-qc" as const,
    icon: Package,
    label: "Ready for QC",
  },
  "Ready for Delivery": {
    variant: "ready-delivery" as const,
    icon: Truck,
    label: "Ready for Delivery",
  },
  Delivered: {
    variant: "delivered" as const,
    icon: CheckCircle2,
    label: "Delivered",
  },
};

export function OrderStatusBadge({ 
  status, 
  urgency, 
  showIcon = true,
  className,
  deliveryPendingConfirmation = false,
}: OrderStatusBadgeProps) {
  // Show "Awaiting Confirmation" state when delivery is pending confirmation
  if (deliveryPendingConfirmation && status === "Ready for Delivery") {
    return (
      <Badge 
        variant="outline"
        className={cn(
          "gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
          className
        )}
      >
        {showIcon && <Timer className="h-3 w-3 animate-pulse" />}
        <span>Awaiting Confirmation</span>
      </Badge>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;
  
  // Override with urgent variant if urgency is Urgent
  const variant = urgency === "Urgent" ? "urgent" : config.variant;
  
  return (
    <Badge 
      variant={variant}
      className={cn("gap-1.5", className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{urgency === "Urgent" ? "🔥 " : ""}{config.label}</span>
    </Badge>
  );
}

interface WorkflowStatusBadgeProps {
  active: boolean;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export function WorkflowStatusBadge({ 
  active, 
  label,
  showIcon = true,
  className 
}: WorkflowStatusBadgeProps) {
  return (
    <Badge 
      variant={active ? "active" : "inactive"}
      className={cn("gap-1.5", className)}
    >
      {showIcon && (
        <div className={cn(
          "h-2 w-2 rounded-full",
          active ? "bg-white animate-pulse" : "bg-muted-foreground/50"
        )} />
      )}
      <span>{label || (active ? "Active" : "Inactive")}</span>
    </Badge>
  );
}

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  className?: string;
}

export function UrgencyBadge({ urgency, className }: UrgencyBadgeProps) {
  return (
    <Badge 
      variant={urgency === "Urgent" ? "urgent" : "normal"}
      className={cn("gap-1.5", className)}
    >
      {urgency === "Urgent" && <span className="text-sm">🔥</span>}
      <span>{urgency}</span>
    </Badge>
  );
}
