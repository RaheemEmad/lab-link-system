import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DoctorVerifiedBadgeProps {
  userId: string;
  showTooltip?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function DoctorVerifiedBadge({ userId, showTooltip = true, size = "sm", className }: DoctorVerifiedBadgeProps) {
  const { data: verification } = useQuery({
    queryKey: ["doctor-verification", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_verification")
        .select("is_verified, completed_order_count, verified_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (!verification?.is_verified) return null;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  const badge = (
    <Badge
      variant="default"
      className={cn(
        "bg-emerald-500/90 hover:bg-emerald-500 text-white gap-1 text-[10px] font-medium",
        size === "md" && "text-xs px-2.5 py-0.5",
        className
      )}
    >
      <ShieldCheck className={iconSize} />
      Verified
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          Verified doctor · {verification.completed_order_count} completed orders
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
