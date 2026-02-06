import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Zap, Info } from "lucide-react";

// Helper to format EGP
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`;
};

interface TemplatePricingViewerProps {
  showCard?: boolean;
  className?: string;
  compact?: boolean;
}

interface PricingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  restoration_type: string | null;
  urgency_level: string | null;
  amount: number;
  is_percentage: boolean;
  is_active: boolean;
}

export function TemplatePricingViewer({ 
  showCard = true, 
  className = "",
  compact = false 
}: TemplatePricingViewerProps) {
  // Fetch platform template pricing from pricing_rules table
  const { data: pricingRules, isLoading, error } = useQuery({
    queryKey: ['template-pricing-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('is_active', true)
        .order('restoration_type', { ascending: true });
      
      if (error) throw error;
      return data as PricingRule[];
    },
  });

  // Group pricing by type
  const basePrices = pricingRules?.filter(r => r.rule_type === 'base_price') || [];
  const urgencyFees = pricingRules?.filter(r => r.rule_type === 'urgency_fee') || [];
  
  // Get default rush surcharge
  const rushSurcharge = urgencyFees.find(r => r.urgency_level === 'Rush');

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error || !pricingRules) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Unable to load template pricing
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Base Prices Grid */}
      <div className={compact ? "grid gap-2 grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
        {basePrices.map((rule) => (
          <div 
            key={rule.id} 
            className={`flex items-center justify-between p-3 rounded-lg border bg-muted/30 ${compact ? 'p-2' : ''}`}
          >
            <div>
              <p className={`font-medium ${compact ? 'text-sm' : ''}`}>
                {rule.restoration_type || rule.rule_name}
              </p>
            </div>
            <p className={`font-semibold text-primary ${compact ? 'text-sm' : ''}`}>
              {formatEGP(rule.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Rush Surcharge Info */}
      {rushSurcharge && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Zap className="h-4 w-4 text-orange-500" />
          <span>
            Rush orders: +{rushSurcharge.is_percentage ? `${rushSurcharge.amount}%` : formatEGP(rushSurcharge.amount)}
          </span>
        </div>
      )}

      {/* Info notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 mt-4">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          These are platform standard prices. All labs using template pricing follow these rates.
        </p>
      </div>
    </div>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Platform Template Pricing
        </CardTitle>
        <CardDescription>
          Standard prices applied across all template-mode labs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

export default TemplatePricingViewer;
