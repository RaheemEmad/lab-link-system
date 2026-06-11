import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  formatRenewal,
  getCurrencyFormatter,
  inferBillingPeriod,
  periodUnitLabel,
  type BillingPeriod,
} from "@/lib/renewalFormat";

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    monthly_fee: number;
    per_order_fee: number;
    features: any;
    billing_period?: BillingPeriod | null;
    trial_days?: number | null;
    next_renewal_at?: string | null;
  };
  isCurrentPlan: boolean;
  borderClass: string;
  onSelect: () => void;
  isLoading: boolean;
}

export const PlanCard = ({ plan, isCurrentPlan, borderClass, onSelect, isLoading }: PlanCardProps) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const features = Array.isArray(plan.features) ? plan.features : [];
  const isPopular = plan.name === "Gold";

  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const period = inferBillingPeriod(plan.monthly_fee, plan.billing_period ?? null);
  const currency = getCurrencyFormatter(isAr ? "ar" : "en");
  const formattedPrice = currency.format(plan.monthly_fee || 0);
  const unit = periodUnitLabel(isAr ? "ar" : "en", period);
  const renewalText = formatRenewal({
    locale: isAr ? "ar" : "en",
    period,
    trialDays: plan.trial_days ?? undefined,
    nextRenewalAt: plan.next_renewal_at ?? undefined,
  });

  const runSelect = () => {
    if (isCurrentPlan || isSelecting) return;
    setError(null);
    setIsSelecting(true);
    setAnnouncement(isAr ? `جارٍ تحديد خطة ${plan.name}...` : `Selecting ${plan.name} plan…`);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.(15); } catch { /* noop */ }
    }
    setTimeout(() => {
      try {
        onSelect();
        setAnnouncement(isAr ? `تم تحديد خطة ${plan.name}` : `${plan.name} plan selected`);
        setTimeout(() => setIsSelecting(false), 400);
      } catch (e) {
        console.error("PlanCard select error:", e);
        setError(isAr ? "تعذّر تحديد الخطة. حاول مرة أخرى." : "Couldn't select this plan. Please retry.");
        setAnnouncement(isAr ? "حدث خطأ أثناء تحديد الخطة" : "Selection failed");
        setIsSelecting(false);
      }
    }, 450);
  };

  return (
    <Card
      aria-busy={isSelecting}
      aria-disabled={isSelecting || isCurrentPlan}
      aria-pressed={isSelecting}
      data-state={isSelecting ? "selecting" : isCurrentPlan ? "current" : error ? "error" : "idle"}
      className={cn(
        "relative flex flex-col transition-all duration-300 hover-scale overflow-hidden",
        borderClass,
        isCurrentPlan && "bg-primary/5",
        error && "ring-2 ring-destructive/60",
        isSelecting && "ring-2 ring-primary scale-[1.02] shadow-lg animate-pulse pointer-events-none opacity-60 cursor-not-allowed",
      )}
    >
      {/* Polite a11y announcer */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      {isSelecting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-[1px] rounded-lg p-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <div className="text-xs font-medium text-foreground">
            {isAr ? "تحضير القالب…" : "Preparing template…"}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            <div className="font-semibold text-foreground">{plan.name}</div>
            <div>{formattedPrice}{unit !== "—" ? ` / ${unit}` : ""}</div>
            <div className="mt-0.5">{renewalText}</div>
          </div>
        </div>
      )}

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
          <span className="text-sm text-muted-foreground"> EGP{unit !== "—" ? `/${isAr ? unit : unit.slice(0,2)}` : ""}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {plan.per_order_fee > 0
            ? `+ ${plan.per_order_fee} EGP per order`
            : "No per-order commission"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">{renewalText}</p>
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

        {error && (
          <div
            role="alert"
            className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive flex items-start gap-2"
          >
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
              <button
                type="button"
                onClick={runSelect}
                className="mt-1 inline-flex items-center gap-1 underline font-medium hover:no-underline"
              >
                <RotateCcw className="h-3 w-3" />
                {isAr ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          </div>
        )}

        <Button
          className="w-full transition-all"
          variant={isCurrentPlan ? "outline" : isPopular ? "default" : "outline"}
          disabled={isCurrentPlan || isLoading || isSelecting}
          onClick={runSelect}
        >
          {isCurrentPlan ? (
            "Current Plan"
          ) : isSelecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isAr ? "جارٍ التحديد…" : "Selecting…"}
            </>
          ) : error ? (
            isAr ? "إعادة المحاولة" : "Try Again"
          ) : (
            "Select Plan"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
