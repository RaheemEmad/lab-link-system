import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Clock, 
  Zap, 
  TrendingUp, 
  Star,
  Sparkles,
  Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, format } from "date-fns";

interface Lab {
  id: string;
  name: string;
  max_capacity: number;
  current_load: number;
  standard_sla_days: number;
  urgent_sla_days: number;
  pricing_tier: 'budget' | 'standard' | 'premium';
  performance_score: number;
}

interface LabSpecialization {
  lab_id: string;
  restoration_type: string;
  expertise_level: 'basic' | 'intermediate' | 'expert';
  turnaround_days: number;
  is_preferred: boolean;
}

interface LabSelectorProps {
  value: string | null;
  onChange: (labId: string | null) => void;
  restorationType: string;
  urgency: 'Normal' | 'Urgent';
  userId: string;
}

export const LabSelector = ({ 
  value, 
  onChange, 
  restorationType, 
  urgency,
  userId 
}: LabSelectorProps) => {
  const [selectedValue, setSelectedValue] = useState<string>(value || "auto");

  // Fetch active labs with capacity
  const { data: labs, isLoading: labsLoading } = useQuery({
    queryKey: ["available-labs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .eq("is_active", true)
        .order("performance_score", { ascending: false });
      
      if (error) throw error;
      return data as Lab[];
    },
  });

  // Fetch lab specializations
  const { data: specializations } = useQuery({
    queryKey: ["lab-specializations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_specializations")
        .select("*");
      
      if (error) throw error;
      return data as LabSpecialization[];
    },
  });

  // Fetch user's preferred labs
  const { data: preferredLabs } = useQuery({
    queryKey: ["preferred-labs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preferred_labs")
        .select("lab_id, priority_order")
        .eq("dentist_id", userId)
        .order("priority_order");
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    setSelectedValue(value || "auto");
  }, [value]);

  const handleChange = (newValue: string) => {
    setSelectedValue(newValue);
    onChange(newValue === "auto" ? null : newValue);
  };

  const getLabSpecialization = (labId: string) => {
    return specializations?.find(
      s => s.lab_id === labId && s.restoration_type === restorationType
    );
  };

  const isPreferred = (labId: string) => {
    return preferredLabs?.some(p => p.lab_id === labId);
  };

  const getExpectedDeliveryDate = (lab: Lab) => {
    const sla = urgency === 'Urgent' ? lab.urgent_sla_days : lab.standard_sla_days;
    const spec = getLabSpecialization(lab.id);
    const days = spec?.turnaround_days || sla;
    return addDays(new Date(), days);
  };

  const getCapacityStatus = (currentLoad: number, maxCapacity: number) => {
    const percentage = (currentLoad / maxCapacity) * 100;
    if (percentage < 50) return { color: 'text-green-600', status: 'Available' };
    if (percentage < 80) return { color: 'text-orange-600', status: 'Limited' };
    if (percentage < 100) return { color: 'text-red-600', status: 'Nearly Full' };
    return { color: 'text-red-600', status: 'At Capacity' };
  };

  const getPricingBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'premium': return 'default';
      case 'standard': return 'secondary';
      case 'budget': return 'outline';
      default: return 'secondary';
    }
  };

  // Sort labs: preferred first, then by score, then by capacity
  const sortedLabs = labs?.sort((a, b) => {
    const aPreferred = isPreferred(a.id);
    const bPreferred = isPreferred(b.id);
    
    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;
    
    const aCapacity = (a.max_capacity - a.current_load) / a.max_capacity;
    const bCapacity = (b.max_capacity - b.current_load) / b.max_capacity;
    
    return (b.performance_score * bCapacity) - (a.performance_score * aCapacity);
  });

  if (labsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSelectedLabDisplay = () => {
    if (selectedValue === "auto") {
      return (
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Auto-Assign (Recommended)</span>
        </div>
      );
    }
    
    const selectedLab = labs?.find(l => l.id === selectedValue);
    if (!selectedLab) return "Select a lab...";
    
    const preferred = isPreferred(selectedLab.id);
    const spec = getLabSpecialization(selectedLab.id);
    
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        <span>{selectedLab.name}</span>
        {preferred && <Badge variant="default" className="text-xs ml-1">Preferred</Badge>}
        {spec && (
          <Badge variant="secondary" className="text-xs ml-1 capitalize">
            {spec.expertise_level}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Select Lab</h3>
        </div>
        <CardDescription>
          <strong>Auto-Assign:</strong> Order goes to marketplace → Labs apply → You approve the best match.
          <br/>
          <strong>Manual:</strong> Send directly to a specific lab below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedValue} onValueChange={handleChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {getSelectedLabDisplay()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {/* Auto-assign option */}
            <SelectItem value="auto" className="cursor-pointer">
              <div className="flex items-start gap-2 py-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium mb-1">Auto-Assign (Recommended)</div>
                  <p className="text-xs text-muted-foreground">
                    Order published to marketplace. Labs apply, you approve.
                  </p>
                </div>
              </div>
            </SelectItem>

            {/* Available labs */}
            {sortedLabs?.map((lab) => {
              const spec = getLabSpecialization(lab.id);
              const capacity = getCapacityStatus(lab.current_load, lab.max_capacity);
              const expectedDate = getExpectedDeliveryDate(lab);
              const preferred = isPreferred(lab.id);
              const hasSpecialization = !!spec;
              const isDisabled = lab.current_load >= lab.max_capacity || !hasSpecialization;

              return (
                <SelectItem 
                  key={lab.id} 
                  value={lab.id}
                  disabled={isDisabled}
                  className={`cursor-pointer ${preferred ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex flex-col gap-2 py-2 w-full">
                    {/* Lab name and badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{lab.name}</span>
                        {preferred && (
                          <Badge variant="default" className="text-xs">
                            Preferred
                          </Badge>
                        )}
                        <Badge variant={getPricingBadgeVariant(lab.pricing_tier)} className="text-xs">
                          {lab.pricing_tier}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm flex-shrink-0">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{lab.performance_score?.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Specialization info */}
                    {spec ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span className="capitalize">{spec.expertise_level}</span>
                        <span>•</span>
                        <span>{spec.turnaround_days} days turnaround</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-orange-600">
                        <span>No specialization in {restorationType}</span>
                      </div>
                    )}

                    {/* Capacity and delivery info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${capacity.color.replace('text-', 'bg-')}`} />
                        <span className={capacity.color}>{capacity.status}</span>
                        <span className="text-muted-foreground">
                          ({lab.current_load}/{lab.max_capacity})
                        </span>
                      </div>
                      
                      {hasSpecialization && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <div className="flex items-center gap-1.5">
                            {urgency === 'Urgent' ? (
                              <Zap className="h-3 w-3 text-orange-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="text-muted-foreground">
                              {urgency === 'Urgent' ? 'Rush: ' : 'Standard: '}
                              {urgency === 'Urgent' ? lab.urgent_sla_days : lab.standard_sla_days} days
                            </span>
                          </div>
                          
                          <span className="text-muted-foreground">•</span>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Expected: {format(expectedDate, 'MMM dd')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};
