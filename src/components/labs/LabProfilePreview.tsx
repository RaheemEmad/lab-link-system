import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Star, Clock, Zap, TrendingUp, Award, MapPin, Phone, Mail, Globe, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LabSpecialization {
  restoration_type: string;
  expertise_level: 'basic' | 'intermediate' | 'expert';
  turnaround_days: number;
}

interface LabProfilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  labData: {
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
  };
  specializations: LabSpecialization[];
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

export function LabProfilePreview({ isOpen, onClose, labData, specializations }: LabProfilePreviewProps) {
  const capacityPercentage = (labData.current_load / labData.max_capacity) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lab Profile Preview</DialogTitle>
          <p className="text-sm text-muted-foreground">
            This is how dentists will see your lab profile
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
              <h1 className="text-3xl font-bold mb-2">{labData.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getPricingBadgeVariant(labData.pricing_tier)}>
                  {labData.pricing_tier}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-medium">{labData.performance_score?.toFixed(1)}</span>
                  <span className="text-xs">(Performance Score)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {labData.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{labData.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
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
                  <a 
                    href={labData.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {labData.website_url}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Details</CardTitle>
            </CardHeader>
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

          {/* Specializations */}
          {specializations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Specializations
                </CardTitle>
                <CardDescription>
                  Our expertise in various restoration types
                </CardDescription>
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
