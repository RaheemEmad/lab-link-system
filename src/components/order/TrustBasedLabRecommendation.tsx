import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Settings2, 
  ChevronRight,
  Shield,
  Zap
} from "lucide-react";
import { useLabTrustRanking, RankedLab } from "@/hooks/useLabTrustRanking";
import { LabRecommendationCard } from "./LabRecommendationCard";
import { CompareLabsDialog } from "./CompareLabsDialog";
import { OpenMarketWarningDialog } from "./OpenMarketWarningDialog";

interface TrustBasedLabRecommendationProps {
  restorationType: string;
  urgency: 'Normal' | 'Urgent';
  userId: string;
  onLabSelect: (labId: string | null, flowMode: 'trust_recommended' | 'compare_options' | 'open_market') => void;
  selectedLabId: string | null;
}

export const TrustBasedLabRecommendation = ({
  restorationType,
  urgency,
  userId,
  onLabSelect,
  selectedLabId
}: TrustBasedLabRecommendationProps) => {
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showOpenMarketWarning, setShowOpenMarketWarning] = useState(false);

  const { rankedLabs, isLoading, preferredLabIds } = useLabTrustRanking({
    restorationType,
    urgency,
    userId,
    limit: 5
  });

  const handleLabSelect = (labId: string) => {
    onLabSelect(labId, 'trust_recommended');
  };

  const handleCompareSelect = (labId: string, adjustmentNote?: string) => {
    // For now, just select the lab. Adjustment notes would be stored separately
    onLabSelect(labId, 'compare_options');
    setShowCompareDialog(false);
  };

  const handleOpenMarketConfirm = () => {
    onLabSelect(null, 'open_market');
    setShowOpenMarketWarning(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rankedLabs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Lab Selection</CardTitle>
          </div>
          <CardDescription>
            No labs available for {restorationType} at this time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowOpenMarketWarning(true)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Try Open Market
          </Button>
        </CardContent>

        <OpenMarketWarningDialog
          open={showOpenMarketWarning}
          onOpenChange={setShowOpenMarketWarning}
          onConfirm={handleOpenMarketConfirm}
        />
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Recommended Labs</CardTitle>
                <CardDescription className="text-xs">
                  Ranked by trust score • Fixed pricing • Immediate start
                </CardDescription>
              </div>
            </div>
            {urgency === 'Urgent' && (
              <Badge variant="destructive" className="gap-1">
                <Zap className="h-3 w-3" />
                Rush
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Trust Score Explanation */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Trust-first selection:</strong> These labs are ranked by 
              reliability, quality, and expertise. Prices are fixed—no negotiation needed. Select a lab to 
              start your order immediately.
            </p>
          </div>

          {/* Lab Cards */}
          <div className="space-y-4">
            {rankedLabs.slice(0, 3).map(lab => (
              <LabRecommendationCard
                key={lab.id}
                lab={lab}
                isPreferred={preferredLabIds.includes(lab.id)}
                onSelect={handleLabSelect}
                isSelected={selectedLabId === lab.id}
                urgency={urgency}
              />
            ))}
          </div>

          {/* More Options */}
          {rankedLabs.length > 3 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                +{rankedLabs.length - 3} more labs available
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCompareDialog(true)}
              >
                Compare All Options
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Alternative Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCompareDialog(true)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Compare Options
            </Button>
            <Button
              variant="ghost"
              className="flex-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowOpenMarketWarning(true)}
            >
              Advanced / Open Market
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CompareLabsDialog
        open={showCompareDialog}
        onOpenChange={setShowCompareDialog}
        labs={rankedLabs}
        preferredLabIds={preferredLabIds}
        onSelect={handleCompareSelect}
        urgency={urgency}
      />

      <OpenMarketWarningDialog
        open={showOpenMarketWarning}
        onOpenChange={setShowOpenMarketWarning}
        onConfirm={handleOpenMarketConfirm}
      />
    </>
  );
};
