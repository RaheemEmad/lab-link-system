import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AnimatedBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  pulse?: boolean;
  glow?: boolean;
  className?: string;
}

export const AnimatedBadge = ({ 
  children, 
  variant = "default", 
  pulse = false,
  glow = false,
  className 
}: AnimatedBadgeProps) => {
  return (
    <Badge
      variant={variant}
      className={cn(
        "transition-all duration-300",
        pulse && "badge-pulse",
        glow && "badge-glow",
        className
      )}
    >
      {children}
    </Badge>
  );
};
