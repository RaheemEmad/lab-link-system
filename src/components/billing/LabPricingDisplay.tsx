import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Zap, AlertCircle, FileText, Settings } from "lucide-react";
import { TemplatePricingViewer } from "./TemplatePricingViewer";

// Helper to format EGP
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`;
};

type PricingMode = 'TEMPLATE' | 'CUSTOM' | null;

interface LabPricingDisplayProps {
  labId: string;
  pricingMode?: PricingMode;
  showCard?: boolean;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

interface LabPricing {
  id: string;
  lab_id: string;
  restoration_type: string;
  fixed_price: number | null;
  min_price: number | null;
  max_price: number | null;
  rush_surcharge_percent: number | null;
  includes_rush: boolean | null;
  is_current: boolean | null;
}

export function LabPricingDisplay({ 
  labId,
  pricingMode,
  showCard = true, 
  showLabel = true,
  compact = false,
  className = "" 
}: LabPricingDisplayProps) {
  // Fetch lab pricing mode if not provided
  const { data: labData, isLoading: labLoading } = useQuery({
    queryKey: ['lab-pricing-mode', labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labs')
        .select('pricing_mode')
        .eq('id', labId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !pricingMode && !!labId,
  });

  // Fetch lab-specific pricing for CUSTOM mode
  const { data: customPricing, isLoading: customLoading } = useQuery({
    queryKey: ['lab-custom-pricing', labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_pricing')
        .select('*')
        .eq('lab_id', labId)
        .eq('is_current', true);
      
      if (error) throw error;
      return data as LabPricing[];
    },
    enabled: !!labId && (pricingMode === 'CUSTOM' || labData?.pricing_mode === 'CUSTOM'),
  });

  const effectiveMode = pricingMode || labData?.pricing_mode as PricingMode;
  const isLoading = labLoading || customLoading;

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // No pricing configured
  if (!effectiveMode) {
    const notConfiguredContent = (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">Pricing Not Configured</p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            This lab has not set up their pricing yet. Contact the lab directly for pricing information.
          </p>
        </div>
      </div>
    );

    if (!showCard) {
      return <div className={className}>{notConfiguredContent}</div>;
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notConfiguredContent}
        </CardContent>
      </Card>
    );
  }

  // Template pricing mode
  if (effectiveMode === 'TEMPLATE') {
    const templateContent = (
      <div className="space-y-4">
        {showLabel && (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <FileText className="h-3 w-3" />
            Platform Pricing
          </Badge>
        )}
        <TemplatePricingViewer showCard={false} compact={compact} />
      </div>
    );

    if (!showCard) {
      return <div className={className}>{templateContent}</div>;
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
          <CardDescription>
            This lab uses platform standard pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templateContent}
        </CardContent>
      </Card>
    );
  }

  // Custom pricing mode
  if (effectiveMode === 'CUSTOM') {
    const hasCustomPricing = customPricing && customPricing.length > 0;

    const customContent = (
      <div className="space-y-4">
        {showLabel && (
          <Badge variant="default" className="flex items-center gap-1 w-fit">
            <Settings className="h-3 w-3" />
            Custom Pricing
          </Badge>
        )}

        {hasCustomPricing ? (
          <div className={compact ? "grid gap-2 grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
            {customPricing.map((pricing) => (
              <div 
                key={pricing.id} 
                className={`flex items-center justify-between p-3 rounded-lg border bg-muted/30 ${compact ? 'p-2' : ''}`}
              >
                <div>
                  <p className={`font-medium ${compact ? 'text-sm' : ''}`}>
                    {pricing.restoration_type}
                  </p>
                  {pricing.rush_surcharge_percent && pricing.rush_surcharge_percent > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Zap className="h-3 w-3 text-orange-500" />
                      Rush: +{pricing.rush_surcharge_percent}%
                    </p>
                  )}
                </div>
                <p className={`font-semibold text-primary ${compact ? 'text-sm' : ''}`}>
                  {pricing.fixed_price ? formatEGP(pricing.fixed_price) : 'Contact'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Custom pricing is being configured. Contact the lab for current rates.
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          * Prices are per unit. Rush orders may include additional surcharges.
        </p>
      </div>
    );

    if (!showCard) {
      return <div className={className}>{customContent}</div>;
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
          <CardDescription>
            Lab-specific custom pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customContent}
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default LabPricingDisplay;
