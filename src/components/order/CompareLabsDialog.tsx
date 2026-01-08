import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  Shield,
  Award,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { RankedLab, formatEGP } from "@/hooks/useLabTrustRanking";
import { cn } from "@/lib/utils";

interface CompareLabsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labs: RankedLab[];
  preferredLabIds: string[];
  onSelect: (labId: string, adjustmentNote?: string) => void;
  urgency: 'Normal' | 'Urgent';
}

export const CompareLabsDialog = ({
  open,
  onOpenChange,
  labs,
  preferredLabIds,
  onSelect,
  urgency
}: CompareLabsDialogProps) => {
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [showAdjustmentInput, setShowAdjustmentInput] = useState(false);
  const [adjustmentNote, setAdjustmentNote] = useState("");

  const handleSelect = () => {
    if (!selectedLabId) return;
    onSelect(selectedLabId, showAdjustmentInput ? adjustmentNote : undefined);
    onOpenChange(false);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'elite': return Award;
      case 'trusted': return Shield;
      case 'established': return CheckCircle2;
      default: return Sparkles;
    }
  };

  const getPriceDisplay = (lab: RankedLab) => {
    if (lab.pricing?.fixed_price) {
      let price = lab.pricing.fixed_price;
      if (urgency === 'Urgent' && !lab.pricing.includes_rush) {
        price = price * (1 + (lab.pricing.rush_surcharge_percent || 20) / 100);
      }
      return formatEGP(price);
    }
    if (lab.pricing?.min_price && lab.pricing?.max_price) {
      return `${formatEGP(lab.pricing.min_price)} - ${formatEGP(lab.pricing.max_price)}`;
    }
    if (lab.min_price_egp && lab.max_price_egp) {
      return `${formatEGP(lab.min_price_egp)} - ${formatEGP(lab.max_price_egp)}`;
    }
    return 'Contact';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Labs</DialogTitle>
          <DialogDescription>
            Compare the top recommended labs side by side. You can request ONE timing or scope adjustment.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Criteria</th>
                  {labs.slice(0, 5).map(lab => (
                    <th 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3 min-w-[150px]",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      <div className="font-semibold">{lab.name}</div>
                      {preferredLabIds.includes(lab.id) && (
                        <Badge variant="default" className="mt-1 text-xs">Preferred</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Trust Score */}
                <tr className="border-b">
                  <td className="p-3 font-medium">Trust Score</td>
                  {labs.slice(0, 5).map(lab => (
                    <td 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="font-bold">{(lab.trust_score || 0).toFixed(1)}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Price */}
                <tr className="border-b">
                  <td className="p-3 font-medium">Price</td>
                  {labs.slice(0, 5).map(lab => (
                    <td 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3 font-semibold",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      {getPriceDisplay(lab)}
                    </td>
                  ))}
                </tr>

                {/* Delivery Time */}
                <tr className="border-b">
                  <td className="p-3 font-medium">Delivery Time</td>
                  {labs.slice(0, 5).map(lab => (
                    <td 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{lab.estimatedDeliveryDays} days</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* On-Time Rate */}
                <tr className="border-b">
                  <td className="p-3 font-medium">On-Time Rate</td>
                  {labs.slice(0, 5).map(lab => (
                    <td 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className={cn(
                          "h-4 w-4",
                          lab.onTimeRate >= 95 ? "text-emerald-500" : 
                          lab.onTimeRate >= 85 ? "text-amber-500" : "text-red-500"
                        )} />
                        <span>{lab.onTimeRate.toFixed(0)}%</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Completed Cases */}
                <tr className="border-b">
                  <td className="p-3 font-medium">Experience</td>
                  {labs.slice(0, 5).map(lab => (
                    <td 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{lab.completedOrders} cases</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Tier */}
                <tr className="border-b">
                  <td className="p-3 font-medium">Status</td>
                  {labs.slice(0, 5).map(lab => {
                    const TierIcon = getTierIcon(lab.visibility_tier);
                    return (
                      <td 
                        key={lab.id} 
                        className={cn(
                          "text-center p-3",
                          selectedLabId === lab.id && "bg-primary/5"
                        )}
                      >
                        <Badge variant="outline" className="capitalize">
                          <TierIcon className="h-3 w-3 mr-1" />
                          {lab.visibility_tier}
                        </Badge>
                      </td>
                    );
                  })}
                </tr>

                {/* Expertise */}
                <tr className="border-b">
                  <td className="p-3 font-medium">Expertise</td>
                  {labs.slice(0, 5).map(lab => (
                    <td 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      {lab.specialization ? (
                        <Badge variant="secondary" className="capitalize">
                          {lab.specialization.expertise_level}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Select Row */}
                <tr>
                  <td className="p-3"></td>
                  {labs.slice(0, 5).map(lab => (
                    <td 
                      key={lab.id} 
                      className={cn(
                        "text-center p-3",
                        selectedLabId === lab.id && "bg-primary/5"
                      )}
                    >
                      <Button
                        variant={selectedLabId === lab.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedLabId(lab.id)}
                        className="w-full"
                      >
                        {selectedLabId === lab.id ? "Selected" : "Select"}
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Adjustment Request */}
          {selectedLabId && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <Label className="font-medium">Request Adjustment (Optional)</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdjustmentInput(!showAdjustmentInput)}
                >
                  {showAdjustmentInput ? "Cancel" : "Add Request"}
                </Button>
              </div>
              
              {showAdjustmentInput && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="e.g., 'Can you deliver 1 day earlier?' or 'Is the price negotiable for bulk orders?'"
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    className="min-h-[80px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    The lab has 24 hours to respond. Only one adjustment request is allowed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={!selectedLabId}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
