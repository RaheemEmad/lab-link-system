import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PostDeliveryReviewDialogProps {
  orderId: string;
  orderNumber: string;
  labId: string;
  labName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const RatingRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-between">
    <Label className="text-sm">{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

export const PostDeliveryReviewDialog = ({
  orderId,
  orderNumber,
  labId,
  labName,
  open,
  onOpenChange,
  onSubmitted,
}: PostDeliveryReviewDialogProps) => {
  const { user } = useAuth();
  const [overallRating, setOverallRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [turnaroundRating, setTurnaroundRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [accuracyRating, setAccuracyRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("lab_reviews").insert({
        lab_id: labId,
        dentist_id: user.id,
        order_id: orderId,
        rating: overallRating,
        quality_rating: qualityRating,
        turnaround_rating: turnaroundRating,
        communication_rating: communicationRating,
        value_rating: valueRating,
        accuracy_rating: accuracyRating,
        review_text: reviewText.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("You've already reviewed this order");
        } else {
          throw error;
        }
      } else {
        toast.success("Review submitted! Thank you for your feedback.");
      }

      onSubmitted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Rate Your Experience
          </DialogTitle>
          <DialogDescription>
            Rate {labName} for Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RatingRow label="Overall" value={overallRating} onChange={setOverallRating} />
          <RatingRow label="Quality" value={qualityRating} onChange={setQualityRating} />
          <RatingRow label="Turnaround" value={turnaroundRating} onChange={setTurnaroundRating} />
          <RatingRow label="Communication" value={communicationRating} onChange={setCommunicationRating} />
          <RatingRow label="Value for Money" value={valueRating} onChange={setValueRating} />
          <RatingRow label="Accuracy" value={accuracyRating} onChange={setAccuracyRating} />

          <div className="space-y-2 pt-2">
            <Label htmlFor="review-text">Review (optional)</Label>
            <Textarea
              id="review-text"
              placeholder="Share your experience with this lab..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reviewText.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
