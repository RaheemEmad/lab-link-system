import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetSectionProps {
  form: UseFormReturn<any>;
  restorationType: string;
}

// Suggested price ranges by restoration type (in EGP)
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  "Zirconia": { min: 1200, max: 1800 },
  "Zirconia Layer": { min: 1500, max: 2200 },
  "Zirco-Max": { min: 1800, max: 2500 },
  "PFM": { min: 1000, max: 1500 },
  "Acrylic": { min: 600, max: 1000 },
  "E-max": { min: 1500, max: 2000 },
};

// Helper function to format EGP currency
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG')}`;
};

const BudgetSection = ({ form, restorationType }: BudgetSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const priceRange = PRICE_RANGES[restorationType] || { min: 1000, max: 2000 };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">EGP</span>
                <CardTitle className="text-lg">Budget (Optional)</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Set a target budget for labs to bid on. Labs will see this amount and can submit competitive bids.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="targetBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Budget</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">EGP</span>
                      <Input 
                        type="number"
                        placeholder="Enter your target budget"
                        className="pl-12"
                        min={0}
                        step={0.01}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        value={field.value || ''}
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="flex items-center gap-1">
                    <span>Typical range for {restorationType}:</span>
                    <span className="font-medium text-foreground">
                      {formatEGP(priceRange.min)} - {formatEGP(priceRange.max)}
                    </span>
                    <span>per unit</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note to Labs (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any specific requirements that may affect pricing? (e.g., complex anatomy, special materials, rush timeline)"
                      className="resize-none min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>💡 <strong>How it works:</strong> Labs will see your budget and can submit bids. You'll review each bid and can accept, request a revision, or decline. Once you accept a bid, the agreed amount becomes the order's fee.</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default BudgetSection;
