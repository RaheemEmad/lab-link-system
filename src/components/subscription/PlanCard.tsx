import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    monthly_fee: number;
    per_order_fee: number;
    features: any;
  };
  isCurrentPlan: boolean;
  borderClass: string;
  onSelect: () => void;
  isLoading: boolean;
}

export const PlanCard = ({ plan, isCurrentPlan, borderClass, onSelect, isLoading }: PlanCardProps) => {
  const features = Array.isArray(plan.features) ? plan.features : [];
  const isPopular = plan.name === "Gold";

  return (
    <Card className={cn("relative flex flex-col transition-all hover:shadow-lg", borderClass, isCurrentPlan && "bg-primary/5")}>
      {isPopular && (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px]">
          Most Popular
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px]">
          Current
        </Badge>
      )}
      <CardHeader className="pb-2 pt-6 text-center">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{plan.monthly_fee.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground"> EGP/mo</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {plan.per_order_fee > 0
            ? `+ ${plan.per_order_fee} EGP per order`
            : "No per-order commission"}
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-2 flex-1 mb-4">
          {features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : isPopular ? "default" : "outline"}
          disabled={isCurrentPlan || isLoading}
          onClick={onSelect}
        >
          {isCurrentPlan ? "Current Plan" : "Select Plan"}
        </Button>
      </CardContent>
    </Card>
  );
};
