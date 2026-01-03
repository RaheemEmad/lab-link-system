import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Star, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Award,
  Clock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LabBadge {
  id: string;
  lab_id: string;
  badge_type: string;
  badge_value: 'positive' | 'negative';
  earned_at: string;
  expires_at: string | null;
}

interface LabBadgesProps {
  labId: string;
  maxDisplay?: number;
  showAll?: boolean;
  className?: string;
}

const badgeConfig: Record<string, { 
  icon: React.ElementType; 
  label: string; 
  positiveColor: string;
  negativeColor: string;
  description: string;
}> = {
  fast_delivery: {
    icon: Zap,
    label: "Fast Delivery",
    positiveColor: "bg-green-100 text-green-700 border-green-200",
    negativeColor: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Delivers orders quickly"
  },
  slow_delivery: {
    icon: Clock,
    label: "Slow Delivery",
    positiveColor: "bg-green-100 text-green-700 border-green-200",
    negativeColor: "bg-amber-100 text-amber-700 border-amber-200",
    description: "Takes longer to deliver orders"
  },
  high_rating: {
    icon: Star,
    label: "Top Rated",
    positiveColor: "bg-yellow-100 text-yellow-700 border-yellow-200",
    negativeColor: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Consistently high customer ratings"
  },
  low_rating: {
    icon: AlertTriangle,
    label: "Low Rating",
    positiveColor: "bg-green-100 text-green-700 border-green-200",
    negativeColor: "bg-red-100 text-red-700 border-red-200",
    description: "Has received low ratings"
  },
  reliable: {
    icon: Shield,
    label: "Reliable",
    positiveColor: "bg-blue-100 text-blue-700 border-blue-200",
    negativeColor: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Low cancellation rate"
  },
  unreliable: {
    icon: AlertTriangle,
    label: "High Cancellation",
    positiveColor: "bg-green-100 text-green-700 border-green-200",
    negativeColor: "bg-red-100 text-red-700 border-red-200",
    description: "Higher than average cancellation rate"
  },
  verified: {
    icon: CheckCircle2,
    label: "Verified",
    positiveColor: "bg-primary/10 text-primary border-primary/20",
    negativeColor: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Profile verified by LabLink"
  },
  top_performer: {
    icon: Award,
    label: "Top Performer",
    positiveColor: "bg-purple-100 text-purple-700 border-purple-200",
    negativeColor: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Consistently exceeds expectations"
  },
};

export function LabBadges({ labId, maxDisplay = 3, showAll = false, className }: LabBadgesProps) {
  const { data: badges, isLoading } = useQuery({
    queryKey: ["lab-badges", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_badges")
        .select("*")
        .eq("lab_id", labId)
        .or("expires_at.is.null,expires_at.gt.now()");
      
      if (error) throw error;
      return data as LabBadge[];
    },
  });

  if (isLoading || !badges || badges.length === 0) {
    return null;
  }

  // Sort: positive badges first, then by earned_at
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.badge_value === 'positive' && b.badge_value !== 'positive') return -1;
    if (a.badge_value !== 'positive' && b.badge_value === 'positive') return 1;
    return new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime();
  });

  const displayBadges = showAll ? sortedBadges : sortedBadges.slice(0, maxDisplay);
  const remainingCount = sortedBadges.length - displayBadges.length;

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-1", className)}>
        {displayBadges.map((badge) => {
          const config = badgeConfig[badge.badge_type];
          if (!config) return null;
          
          const Icon = config.icon;
          const colorClass = badge.badge_value === 'positive' 
            ? config.positiveColor 
            : config.negativeColor;

          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs gap-1 cursor-default", colorClass)}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}