import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Star, 
  Clock, 
  Zap,
  TrendingUp,
  Award,
  Sparkles
} from "lucide-react";
import { LabBadges } from "./LabBadges";

interface LabSpecialization {
  restoration_type: string;
  expertise_level: 'basic' | 'intermediate' | 'expert';
  turnaround_days: number;
  is_preferred: boolean;
}

interface Lab {
  id: string;
  name: string;
  description: string | null;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  is_active: boolean;
  max_capacity: number;
  current_load: number;
  standard_sla_days: number;
  urgent_sla_days: number;
  pricing_tier: 'budget' | 'standard' | 'premium';
  performance_score: number;
  logo_url: string | null;
  website_url: string | null;
  is_sponsored?: boolean;
  subscription_tier?: string | null;
  cancellation_visible?: boolean;
}

interface LabCardProps {
  lab: Lab;
  specializations: LabSpecialization[];
  isVerified?: boolean;
}

const getPricingBadgeVariant = (tier: string) => {
  switch (tier) {
    case 'premium': return 'default';
    case 'standard': return 'secondary';
    case 'budget': return 'outline';
    default: return 'secondary';
  }
};

const getExpertiseBadgeVariant = (level: string) => {
  switch (level) {
    case 'expert': return 'default';
    case 'intermediate': return 'secondary';
    case 'basic': return 'outline';
    default: return 'secondary';
  }
};

const getCapacityColor = (currentLoad: number, maxCapacity: number) => {
  const percentage = (currentLoad / maxCapacity) * 100;
  if (percentage < 50) return 'text-green-600';
  if (percentage < 80) return 'text-orange-600';
  return 'text-red-600';
};

export function LabCard({ lab, specializations, isVerified = false }: LabCardProps) {
  const capacityPercentage = (lab.current_load / lab.max_capacity) * 100;
  const isSponsored = lab.is_sponsored;

  return (
    <Link to={`/labs/${lab.id}`}>
      <Card className={`hover:shadow-lg transition-shadow h-full ${isVerified ? 'border-primary/50' : ''} ${isSponsored ? 'ring-2 ring-yellow-400/50' : ''}`}>
        {isSponsored && (
          <div className="bg-gradient-to-r from-yellow-400/20 to-amber-400/20 px-3 py-1 text-xs font-medium text-yellow-700 flex items-center gap-1 rounded-t-lg">
            <Sparkles className="h-3 w-3" />
            Sponsored
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1">
              {lab.logo_url ? (
                <img src={lab.logo_url} alt={lab.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg truncate">{lab.name}</CardTitle>
                  {isVerified && <Badge variant="default" className="text-xs">✓</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getPricingBadgeVariant(lab.pricing_tier)}>
                    {lab.pricing_tier}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">{lab.performance_score?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {lab.description && (
            <CardDescription className="line-clamp-2 mt-2">
              {lab.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* SLA */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Standard SLA:</span>
            </div>
            <span className="font-medium">{lab.standard_sla_days} days</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Urgent SLA:</span>
            </div>
            <span className="font-medium">{lab.urgent_sla_days} days</span>
          </div>

        {/* Capacity */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Capacity:</span>
          </div>
          <span className={`font-medium ${getCapacityColor(lab.current_load, lab.max_capacity)}`}>
            {lab.current_load}/{lab.max_capacity} ({Math.round(capacityPercentage)}%)
          </span>
        </div>

        {/* Lab Badges */}
        <LabBadges labId={lab.id} maxDisplay={2} className="pt-1" />

          {/* Specializations */}
          {specializations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <Award className="h-4 w-4" />
                <span>Specializations:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {specializations.slice(0, 3).map((spec, idx) => (
                  <Badge
                    key={idx}
                    variant={getExpertiseBadgeVariant(spec.expertise_level)}
                    className="text-xs"
                  >
                    {spec.restoration_type}
                  </Badge>
                ))}
                {specializations.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{specializations.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
