import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, Clock, Zap, TrendingUp, Award, MapPin, Phone, Mail, Globe, DollarSign, FileText, Settings, CheckCircle, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LabPricingDisplay } from "@/components/billing/LabPricingDisplay";
import { LabVerificationBadge } from "@/components/labs/LabVerificationBadge";
import { Skeleton } from "@/components/ui/skeleton";

interface LabSpecialization {
  restoration_type: string;
  expertise_level: 'basic' | 'intermediate' | 'expert';
  turnaround_days: number;
}

interface LabProfilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  labData: {
    id?: string;
    name: string;
    description: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    max_capacity: number;
    current_load: number;
    standard_sla_days: number;
    urgent_sla_days: number;
    pricing_tier: 'budget' | 'standard' | 'premium';
    performance_score: number;
    logo_url: string | null;
    website_url: string;
    pricing_mode?: 'TEMPLATE' | 'CUSTOM' | null;
  };
  specializations?: LabSpecialization[];
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
  if (percentage < 50) return 'text-green-600 dark:text-green-400';
  if (percentage < 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

export function LabProfilePreview({ isOpen, onClose, labData, specializations: propSpecializations }: LabProfilePreviewProps) {
  const capacityPercentage = (labData.current_load / labData.max_capacity) * 100;

  // Auto-fetch specializations if not provided
  const { data: fetchedSpecializations } = useQuery({
    queryKey: ['lab-specializations-preview', labData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_specializations')
        .select('restoration_type, expertise_level, turnaround_days')
        .eq('lab_id', labData.id!);
      if (error) throw error;
      return data as LabSpecialization[];
    },
    enabled: isOpen && !!labData.id && (!propSpecializations || propSpecializations.length === 0),
  });

  // Auto-fetch lab verification and order count
  const { data: labDetails } = useQuery({
    queryKey: ['lab-details-preview', labData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labs')
        .select('is_verified, verification_status, completed_order_count')
        .eq('id', labData.id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!labData.id,
  });

  // Fetch reviews summary
  const { data: reviewsSummary } = useQuery({
    queryKey: ['lab-reviews-summary', labData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_reviews')
        .select('rating')
        .eq('lab_id', labData.id!);
      if (error) throw error;
      const count = data?.length || 0;
      const avg = count > 0 ? data.reduce((acc, r) => acc + r.rating, 0) / count : 0;
      return { count, average: avg };
    },
    enabled: isOpen && !!labData.id,
  });

  const specializations = (propSpecializations && propSpecializations.length > 0) ? propSpecializations : (fetchedSpecializations || []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lab Profile</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Full lab details, pricing, and capabilities
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header Section */}
          <div className="flex items-start gap-4">
            {labData.logo_url ? (
              <img 
                src={labData.logo_url} 
                alt={labData.name} 
                className="w-20 h-20 rounded-xl object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-border">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{labData.name}</h1>
                {labData.id && labDetails && (
                  <LabVerificationBadge
                    isVerified={labDetails.is_verified || false}
                    verificationStatus={(labDetails.verification_status as 'pending' | 'verified' | 'at_risk' | 'revoked') || 'pending'}
                    completedOrderCount={labDetails.completed_order_count || 0}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <Badge variant={getPricingBadgeVariant(labData.pricing_tier)}>
                  {labData.pricing_tier}
                </Badge>
                {labData.pricing_mode && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {labData.pricing_mode === 'TEMPLATE' ? (
                      <><FileText className="h-3 w-3" />Platform Pricing</>
                    ) : (
                      <><Settings className="h-3 w-3" />Custom Pricing</>
                    )}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-medium">
                    {reviewsSummary ? reviewsSummary.average.toFixed(1) : labData.performance_score?.toFixed(1)}
                  </span>
                  {reviewsSummary && (
                    <span className="text-xs">({reviewsSummary.count} reviews)</span>
                  )}
                </div>
                {labDetails?.completed_order_count != null && labDetails.completed_order_count > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Package className="h-3 w-3" />
                    {labDetails.completed_order_count} completed
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {labData.description && (
            <Card>
              <CardHeader><CardTitle className="text-lg">About</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{labData.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{labData.contact_email}</span>
              </div>
              {labData.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{labData.contact_phone}</span>
                </div>
              )}
              {labData.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{labData.address}</span>
                </div>
              )}
              {labData.website_url && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={labData.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {labData.website_url}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Service Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Standard SLA:</span>
                </div>
                <span className="font-medium">{labData.standard_sla_days} days</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Urgent SLA:</span>
                </div>
                <span className="font-medium">{labData.urgent_sla_days} days</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Current Capacity:</span>
                </div>
                <span className={`font-medium ${getCapacityColor(labData.current_load, labData.max_capacity)}`}>
                  {labData.current_load}/{labData.max_capacity} ({Math.round(capacityPercentage)}%)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Section - Full Display */}
          {labData.id && (
            <LabPricingDisplay 
              labId={labData.id} 
              pricingMode={labData.pricing_mode}
              showLabel
            />
          )}

          {/* Specializations */}
          {specializations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Specializations
                </CardTitle>
                <CardDescription>Expertise in various restoration types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {specializations.map((spec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge variant={getExpertiseBadgeVariant(spec.expertise_level)}>
                          {spec.expertise_level}
                        </Badge>
                        <span className="font-medium">{spec.restoration_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{spec.turnaround_days} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
