import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Crown, XCircle } from "lucide-react";

export const SubscriptionAlerts = () => {
  const navigate = useNavigate();
  const { isExpired, isExpiringSoon, daysUntilExpiry, hasSubscription, planName, isLoading } = useSubscriptionGuard();

  if (isLoading) return null;

  // No subscription at all
  if (!hasSubscription) {
    return (
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Crown className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                Choose a subscription plan to unlock all features
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/plans")} className="text-xs shrink-0">
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expired
  if (isExpired) {
    return (
      <Card className="border-destructive/50 bg-destructive/5 mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                Your {planName} plan has expired. Renew to continue placing orders.
              </span>
            </div>
            <Button size="sm" variant="destructive" onClick={() => navigate("/plans")} className="text-xs shrink-0">
              Renew
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expiring soon
  if (isExpiringSoon) {
    return (
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                Your {planName} plan expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/plans")} className="text-xs shrink-0">
              Renew Early
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
