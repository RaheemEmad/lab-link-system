import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Star, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles,
  Shield,
  Award,
  Zap,
  AlertCircle
} from "lucide-react";
import { RankedLab, formatEGP } from "@/hooks/useLabTrustRanking";
import { cn } from "@/lib/utils";

interface LabRecommendationCardProps {
  lab: RankedLab;
  isPreferred: boolean;
  onSelect: (labId: string) => void;
  isSelected?: boolean;
  urgency: 'Normal' | 'Urgent';
}

export const LabRecommendationCard = ({
  lab,
  isPreferred,
  onSelect,
  isSelected,
  urgency
}: LabRecommendationCardProps) => {
  const getTierBadge = () => {
    switch (lab.visibility_tier) {
      case 'elite':
        return { icon: Award, label: 'Elite', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
      case 'trusted':
        return { icon: Shield, label: 'Trusted', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' };
      case 'established':
        return { icon: CheckCircle2, label: 'Established', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
      case 'emerging':
        return { icon: Sparkles, label: 'New Lab', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' };
      default:
        return null;
    }
  };

  const getExpertiseBadge = () => {
    if (!lab.specialization) return null;
    switch (lab.specialization.expertise_level) {
      case 'expert':
        return { label: 'Expert', className: 'bg-primary/10 text-primary' };
      case 'intermediate':
        return { label: 'Skilled', className: 'bg-secondary text-secondary-foreground' };
      case 'basic':
        return { label: 'Standard', className: 'bg-muted text-muted-foreground' };
      default:
        return null;
    }
  };

  const getPriceDisplay = () => {
    if (lab.pricing) {
      if (lab.pricing.fixed_price) {
        let price = lab.pricing.fixed_price;
        if (urgency === 'Urgent' && !lab.pricing.includes_rush) {
          price = price * (1 + (lab.pricing.rush_surcharge_percent || 20) / 100);
        }
        return formatEGP(price);
      }
      if (lab.pricing.min_price && lab.pricing.max_price) {
        return `${formatEGP(lab.pricing.min_price)} - ${formatEGP(lab.pricing.max_price)}`;
      }
    }
    // Fallback to lab-level pricing
    if (lab.min_price_egp && lab.max_price_egp) {
      return `${formatEGP(lab.min_price_egp)} - ${formatEGP(lab.max_price_egp)}`;
    }
    return 'Contact for pricing';
  };

  const tierBadge = getTierBadge();
  const expertiseBadge = getExpertiseBadge();

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "relative transition-all duration-200 hover:shadow-md",
          isSelected && "ring-2 ring-primary shadow-lg",
          isPreferred && "border-primary/30 bg-primary/5",
          lab.rank === 1 && "border-primary"
        )}
      >
        {/* Rank Badge */}
        <div className={cn(
          "absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md",
          lab.rank === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          #{lab.rank}
        </div>

        {/* Recommended Label */}
        {lab.rank === 1 && (
          <div className="absolute -top-3 left-8 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded">
            RECOMMENDED
          </div>
        )}

        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col gap-3">
            {/* Header: Name + Trust Score */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base truncate">{lab.name}</h4>
                {lab.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {lab.description}
                  </p>
                )}
              </div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 rounded-md cursor-help">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span className="font-bold text-sm">{(lab.trust_score || 0).toFixed(1)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium mb-1">Trust Score</p>
                  <p className="text-xs">Composite score based on:</p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    <li>• SLA Compliance (30%)</li>
                    <li>• Quality Ratings (25%)</li>
                    <li>• Experience (20%)</li>
                    <li>• Reliability (25%)</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-1.5">
              {isPreferred && (
                <Badge variant="default" className="text-xs">
                  ⭐ Preferred
                </Badge>
              )}
              {tierBadge && (
                <Badge variant="outline" className={cn("text-xs", tierBadge.className)}>
                  <tierBadge.icon className="h-3 w-3 mr-1" />
                  {tierBadge.label}
                </Badge>
              )}
              {expertiseBadge && (
                <Badge variant="secondary" className={cn("text-xs", expertiseBadge.className)}>
                  {expertiseBadge.label}
                </Badge>
              )}
              {lab.is_new_lab && lab.visibility_tier !== 'emerging' && (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600">
                  New
                </Badge>
              )}
            </div>

            {/* Price + Delivery Row */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">EGP</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{getPriceDisplay()}</p>
                  <p className="text-xs text-muted-foreground">
                    {urgency === 'Urgent' && !lab.pricing?.includes_rush ? 'Rush fee included' : 'Fixed price'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  urgency === 'Urgent' ? "bg-orange-100 dark:bg-orange-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                )}>
                  {urgency === 'Urgent' ? (
                    <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{lab.estimatedDeliveryDays} days</p>
                  <p className="text-xs text-muted-foreground">
                    {urgency === 'Urgent' ? 'Rush delivery' : 'Standard'}
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-3">
              {lab.onTimeRate > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{lab.onTimeRate.toFixed(0)}% On-Time</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Orders delivered on or before expected date</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {lab.completedOrders > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                      <span>{lab.completedOrders} cases</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Total completed orders</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {lab.averageRating && lab.totalReviews > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      <span>{lab.averageRating.toFixed(1)} ({lab.totalReviews} reviews)</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Average rating from doctors</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {lab.specialization && (
                <div className="flex items-center gap-1">
                  <span className="capitalize">{lab.specialization.expertise_level} in type</span>
                </div>
              )}
            </div>

            {/* Select Button */}
            <Button
              variant={isSelected ? "default" : "outline"}
              className="w-full mt-2"
              onClick={() => onSelect(lab.id)}
            >
              {isSelected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Selected
                </>
              ) : (
                "Select Lab"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
