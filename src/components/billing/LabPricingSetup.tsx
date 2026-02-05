import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Save, 
  Loader2, 
  Zap,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

// Restoration types matching the system
const RESTORATION_TYPES = [
  "Zirconia",
  "Zirconia Layer", 
  "Zirco-Max",
  "E-max",
  "PFM",
  "Acrylic",
] as const;

type RestorationType = typeof RESTORATION_TYPES[number];

interface PricingRow {
  restoration_type: RestorationType;
  fixed_price: number | null;
  rush_surcharge_percent: number;
  includes_rush: boolean;
}

interface LabPricingSetupProps {
  labId: string;
  readOnly?: boolean;
}

// Helper to format EGP
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`;
};

const LabPricingSetup = ({ labId, readOnly = false }: LabPricingSetupProps) => {
  const queryClient = useQueryClient();
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch existing lab pricing
  const { data: existingPricing, isLoading } = useQuery({
    queryKey: ['lab-pricing', labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_pricing')
        .select('*')
        .eq('lab_id', labId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!labId,
  });

  // Initialize pricing state from existing data
  useEffect(() => {
    if (existingPricing !== undefined) {
      const initialPricing: PricingRow[] = RESTORATION_TYPES.map(type => {
        const existing = existingPricing.find(p => p.restoration_type === type);
        return {
          restoration_type: type,
          fixed_price: existing?.fixed_price ?? null,
          rush_surcharge_percent: existing?.rush_surcharge_percent ?? 25,
          includes_rush: existing?.includes_rush ?? false,
        };
      });
      setPricing(initialPricing);
      setHasChanges(false);
    }
  }, [existingPricing]);

  // Save pricing mutation
  const savePricingMutation = useMutation({
    mutationFn: async () => {
      // Filter out rows with no price set
      const rowsToSave = pricing.filter(p => p.fixed_price !== null && p.fixed_price > 0);
      
      // Delete existing pricing for this lab
      const { error: deleteError } = await supabase
        .from('lab_pricing')
        .delete()
        .eq('lab_id', labId);
      
      if (deleteError) throw deleteError;

      // Insert new pricing
      if (rowsToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('lab_pricing')
          .insert(rowsToSave.map(p => ({
            lab_id: labId,
            restoration_type: p.restoration_type,
            fixed_price: p.fixed_price,
            rush_surcharge_percent: p.rush_surcharge_percent,
            includes_rush: p.includes_rush,
          })));
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-pricing', labId] });
      setHasChanges(false);
      toast.success('Pricing saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save pricing', { description: error.message });
    }
  });

  const updatePricing = (type: RestorationType, field: keyof PricingRow, value: any) => {
    setPricing(prev => prev.map(p => 
      p.restoration_type === type ? { ...p, [field]: value } : p
    ));
    setHasChanges(true);
  };

  const handlePriceChange = (type: RestorationType, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    updatePricing(type, 'fixed_price', numValue);
  };

  const handleRushPercentChange = (type: RestorationType, value: string) => {
    const numValue = parseInt(value) || 0;
    updatePricing(type, 'rush_surcharge_percent', Math.min(100, Math.max(0, numValue)));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const pricedCount = pricing.filter(p => p.fixed_price !== null && p.fixed_price > 0).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {readOnly ? 'Pricing' : 'Lab Pricing Setup'}
            </CardTitle>
            <CardDescription>
              {readOnly 
                ? 'Standard prices per restoration type'
                : 'Set your standard prices for each restoration type'}
            </CardDescription>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved
                </Badge>
              )}
              <Badge variant="secondary">
                {pricedCount}/{RESTORATION_TYPES.length} configured
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header row */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
            <div className="col-span-4">Restoration Type</div>
            <div className="col-span-3">Price/Unit (EGP)</div>
            <div className="col-span-3">Rush Surcharge</div>
            <div className="col-span-2 text-center">Status</div>
          </div>

          {/* Pricing rows */}
          {pricing.map((row) => (
            <div 
              key={row.restoration_type}
              className={`
                grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 rounded-lg border
                ${row.fixed_price ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-background'}
              `}
            >
              {/* Type name */}
              <div className="sm:col-span-4 flex items-center gap-2">
                <span className="font-medium">{row.restoration_type}</span>
              </div>

              {/* Price input */}
              <div className="sm:col-span-3">
                <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                  Price/Unit (EGP)
                </Label>
                {readOnly ? (
                  <span className="font-semibold">
                    {row.fixed_price ? formatEGP(row.fixed_price) : '—'}
                  </span>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      EGP
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={row.fixed_price ?? ''}
                      onChange={(e) => handlePriceChange(row.restoration_type, e.target.value)}
                      className="pl-12"
                      min={0}
                      step={10}
                    />
                  </div>
                )}
              </div>

              {/* Rush surcharge */}
              <div className="sm:col-span-3">
                <Label className="sm:hidden text-xs text-muted-foreground mb-1 block">
                  Rush Surcharge
                </Label>
                {readOnly ? (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Zap className="h-3.5 w-3.5 text-orange-500" />
                    <span>+{row.rush_surcharge_percent}%</span>
                  </div>
                ) : (
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                    <Input
                      type="number"
                      placeholder="25"
                      value={row.rush_surcharge_percent}
                      onChange={(e) => handleRushPercentChange(row.restoration_type, e.target.value)}
                      className="pl-10 pr-8"
                      min={0}
                      max={100}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="sm:col-span-2 flex items-center justify-start sm:justify-center">
                {row.fixed_price && row.fixed_price > 0 ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Not Set
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {/* Save button */}
          {!readOnly && (
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={() => savePricingMutation.mutate()}
                disabled={savePricingMutation.isPending || !hasChanges}
                className="gap-2"
              >
                {savePricingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Pricing
              </Button>
            </div>
          )}

          {/* Info note */}
          {!readOnly && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>How pricing works:</strong> When a doctor places an order, your configured price 
                will be used automatically. If no price is set for a restoration type, global pricing rules apply.
                Rush orders will automatically include the surcharge percentage you set.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LabPricingSetup;
