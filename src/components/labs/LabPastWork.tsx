import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote, TrendingUp, CheckCircle2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DoctorVerifiedBadge } from "@/components/doctors/DoctorVerifiedBadge";
import { formatEGP } from "@/lib/formatters";

interface LabPastWorkProps {
  labId: string;
}

export function LabPastWork({ labId }: LabPastWorkProps) {
  // Fetch completed orders count
  const { data: stats } = useQuery({
    queryKey: ["lab-completed-stats", labId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("assigned_lab_id", labId)
        .eq("status", "Delivered");
      if (error) throw error;
      return { completedOrders: count || 0 };
    },
  });

  // Fetch reviews with doctor profiles
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["lab-reviews-detailed", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_reviews")
        .select(`
          id, rating, review_text, created_at,
          quality_rating, turnaround_rating, communication_rating,
          accuracy_rating, value_rating,
          order_id,
          profiles:dentist_id (id, full_name, clinic_name)
        `)
        .eq("lab_id", labId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Aggregate ratings
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingBreakdown = reviews.length > 0
    ? {
        quality: reviews.filter(r => r.quality_rating).reduce((s, r) => s + (r.quality_rating || 0), 0) / reviews.filter(r => r.quality_rating).length || 0,
        turnaround: reviews.filter(r => r.turnaround_rating).reduce((s, r) => s + (r.turnaround_rating || 0), 0) / reviews.filter(r => r.turnaround_rating).length || 0,
        communication: reviews.filter(r => r.communication_rating).reduce((s, r) => s + (r.communication_rating || 0), 0) / reviews.filter(r => r.communication_rating).length || 0,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats?.completedOrders || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed Orders</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{reviews.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Reviews</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">
                {reviews.length > 0
                  ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Satisfaction Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating Breakdown */}
      {ratingBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rating Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Quality", value: ratingBreakdown.quality },
                { label: "Turnaround", value: ratingBreakdown.turnaround },
                { label: "Communication", value: ratingBreakdown.communication },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-28">{label}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Doctor Testimonials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Quote className="h-4 w-4" />
            Doctor Reviews & Testimonials
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No reviews yet. Reviews will appear here once doctors rate this lab.
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const profile = review.profiles as any;
                return (
                  <div
                    key={review.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {profile?.full_name?.[0] || "D"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">
                              {profile?.full_name || "Doctor"}
                            </span>
                            {profile?.id && (
                              <DoctorVerifiedBadge userId={profile.id} size="sm" />
                            )}
                          </div>
                          {profile?.clinic_name && (
                            <p className="text-[10px] text-muted-foreground">{profile.clinic_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        "{review.review_text}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                      {review.order_id && (
                        <Badge variant="outline" className="text-[9px]">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          Verified Order
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
