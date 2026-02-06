import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DollarSign, 
  FileText, 
  Settings, 
  Check, 
  ArrowRight, 
  Zap,
  Info,
  Sparkles
} from "lucide-react";

type PricingMode = 'TEMPLATE' | 'CUSTOM';

interface PricingEntry {
  restoration_type: string;
  fixed_price: number;
  rush_surcharge_percent: number;
}

interface PricingModeSelectorProps {
  onComplete: (mode: PricingMode, customPricing?: PricingEntry[]) => void;
  isLoading?: boolean;
}

const RESTORATION_TYPES = [
  "Crown",
  "Bridge",
  "Zirconia Layer",
  "Zirco-Max",
  "Zirconia",
  "E-max",
  "PFM",
  "Metal",
  "Acrylic"
] as const;

// Helper to format EGP
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`;
};

export function PricingModeSelector({ onComplete, isLoading = false }: PricingModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PricingMode | null>(null);
  const [customPricing, setCustomPricing] = useState<Record<string, PricingEntry>>(
    RESTORATION_TYPES.reduce((acc, type) => ({
      ...acc,
      [type]: { restoration_type: type, fixed_price: 0, rush_surcharge_percent: 25 }
    }), {})
  );
  const [step, setStep] = useState<'choose' | 'configure'>('choose');

  // Fetch platform template pricing for preview
  const { data: templatePricing, isLoading: templateLoading } = useQuery({
    queryKey: ['template-pricing-onboarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('is_active', true)
        .eq('rule_type', 'base_price')
        .order('restoration_type', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Get rush surcharge from template
  const { data: rushSurcharge } = useQuery({
    queryKey: ['template-rush-surcharge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('amount, is_percentage')
        .eq('is_active', true)
        .eq('rule_type', 'urgency_fee')
        .eq('urgency_level', 'Urgent')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const handleModeSelect = (mode: PricingMode) => {
    setSelectedMode(mode);
    if (mode === 'TEMPLATE') {
      setStep('configure'); // Just confirmation for template
    } else {
      setStep('configure'); // Custom pricing entry
    }
  };

  const handleCustomPriceChange = (type: string, field: 'fixed_price' | 'rush_surcharge_percent', value: string) => {
    setCustomPricing(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const handleConfirm = () => {
    if (selectedMode === 'TEMPLATE') {
      onComplete('TEMPLATE');
    } else {
      const pricingEntries = Object.values(customPricing).filter(p => p.fixed_price > 0);
      onComplete('CUSTOM', pricingEntries);
    }
  };

  const isCustomValid = () => {
    // At least 3 prices must be set for custom mode
    const setCount = Object.values(customPricing).filter(p => p.fixed_price > 0).length;
    return setCount >= 3;
  };

  if (step === 'choose') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Choose Your Pricing Strategy</CardTitle>
          </div>
          <CardDescription className="text-base">
            Select how you want to price your lab services. This determines what doctors see when viewing your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Template Pricing Option */}
            <button
              onClick={() => handleModeSelect('TEMPLATE')}
              className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                selectedMode === 'TEMPLATE' 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Platform Template Pricing</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use our standard prices across all restoration types. Simple, no setup required.
                  </p>
                  
                  <Badge variant="secondary" className="mb-4">Recommended for New Labs</Badge>

                  {templateLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {templatePricing?.slice(0, 4).map((rule) => (
                        <div key={rule.id} className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">{rule.restoration_type}</span>
                          <span className="font-medium">{formatEGP(rule.amount)}</span>
                        </div>
                      ))}
                      {templatePricing && templatePricing.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{templatePricing.length - 4} more types...
                        </p>
                      )}
                      {rushSurcharge && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                          <Zap className="h-3 w-3" />
                          Rush: +{rushSurcharge.is_percentage ? `${rushSurcharge.amount}%` : formatEGP(rushSurcharge.amount)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Custom Pricing Option */}
            <button
              onClick={() => handleModeSelect('CUSTOM')}
              className={`text-left p-6 rounded-xl border-2 transition-all hover:shadow-lg ${
                selectedMode === 'CUSTOM' 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Custom Lab Pricing</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set your own prices for each restoration type. Full control over your rates.
                  </p>
                  
                  <Badge variant="outline" className="mb-4">For Established Labs</Badge>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span className="text-muted-foreground">Your Price</span>
                      <span className="font-medium text-primary">You Decide</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-dashed">
                      <span className="text-muted-foreground">Rush Surcharge</span>
                      <span className="font-medium text-primary">Customizable</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Per Type Control</span>
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50 mt-6">
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              You can change your pricing mode later in Lab Admin → Pricing. Price changes only affect future orders.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Configuration step
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setStep('choose')}
            disabled={isLoading}
          >
            ← Back
          </Button>
        </div>
        <CardTitle className="text-xl flex items-center gap-2">
          {selectedMode === 'TEMPLATE' ? (
            <>
              <FileText className="h-5 w-5 text-blue-600" />
              Confirm Platform Template Pricing
            </>
          ) : (
            <>
              <Settings className="h-5 w-5 text-purple-600" />
              Configure Custom Pricing
            </>
          )}
        </CardTitle>
        <CardDescription>
          {selectedMode === 'TEMPLATE' 
            ? "Review the template prices that will apply to your lab"
            : "Set your prices for each restoration type (min 3 required)"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedMode === 'TEMPLATE' ? (
          // Template confirmation
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templatePricing?.map((rule) => (
                <div 
                  key={rule.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <span className="font-medium">{rule.restoration_type}</span>
                  <span className="font-semibold text-primary">{formatEGP(rule.amount)}</span>
                </div>
              ))}
            </div>

            {rushSurcharge && (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-orange-500" />
                <span>Rush orders: +{rushSurcharge.is_percentage ? `${rushSurcharge.amount}%` : formatEGP(rushSurcharge.amount)}</span>
              </div>
            )}

            <Button 
              onClick={handleConfirm} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Confirm Template Pricing"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          // Custom pricing entry
          <div className="space-y-6">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {RESTORATION_TYPES.map((type) => (
                  <div key={type} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <Label className="font-medium">{type}</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">EGP</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={customPricing[type]?.fixed_price || ''}
                            onChange={(e) => handleCustomPriceChange(type, 'fixed_price', e.target.value)}
                            className="pl-12 text-right"
                          />
                        </div>
                      </div>
                      <div className="w-20">
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="25"
                            value={customPricing[type]?.rush_surcharge_percent || ''}
                            onChange={(e) => handleCustomPriceChange(type, 'rush_surcharge_percent', e.target.value)}
                            className="pr-6 text-right"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <Zap className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Prices set: {Object.values(customPricing).filter(p => p.fixed_price > 0).length} / {RESTORATION_TYPES.length}
              </span>
              {!isCustomValid() && (
                <span className="text-amber-600">Set at least 3 prices to continue</span>
              )}
            </div>

            <Button 
              onClick={handleConfirm} 
              className="w-full" 
              size="lg"
              disabled={isLoading || !isCustomValid()}
            >
              {isLoading ? "Saving..." : "Save Custom Pricing"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PricingModeSelector;
