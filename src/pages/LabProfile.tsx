import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Building2, MapPin, Phone, Mail, Globe, Clock, Star, Users, Heart, ArrowLeft, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function LabProfile() {
  const { labId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch lab details
  const { data: lab, isLoading: labLoading } = useQuery({
    queryKey: ["lab", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .eq("id", labId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch lab specializations
  const { data: specializations } = useQuery({
    queryKey: ["lab-specializations", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_specializations")
        .select("*")
        .eq("lab_id", labId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch lab photos
  const { data: photos } = useQuery({
    queryKey: ["lab-photos", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_photos")
        .select("*")
        .eq("lab_id", labId)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch lab reviews
  const { data: reviews } = useQuery({
    queryKey: ["lab-reviews", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_reviews")
        .select(`
          *,
          profiles:dentist_id (full_name, email)
        `)
        .eq("lab_id", labId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Check if lab is bookmarked
  const { data: isBookmarked } = useQuery({
    queryKey: ["preferred-lab", labId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("preferred_labs")
        .select("id")
        .eq("dentist_id", user.id)
        .eq("lab_id", labId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Toggle bookmark mutation
  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Must be logged in");
      
      if (isBookmarked) {
        const { error } = await supabase
          .from("preferred_labs")
          .delete()
          .eq("dentist_id", user.id)
          .eq("lab_id", labId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("preferred_labs")
          .insert({ dentist_id: user.id, lab_id: labId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferred-lab", labId, user?.id] });
      toast({
        title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
        description: isBookmarked 
          ? "Lab removed from your preferred labs" 
          : "Lab added to your preferred labs",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit review mutation
  const submitReview = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("lab_reviews")
        .insert({
          lab_id: labId,
          dentist_id: user.id,
          rating,
          review_text: reviewText,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-reviews", labId] });
      setReviewText("");
      setRating(5);
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (labLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Lab not found</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : lab.performance_score || 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {user && (
          <Button
            variant={isBookmarked ? "default" : "outline"}
            onClick={() => toggleBookmark.mutate()}
            disabled={toggleBookmark.isPending}
          >
            <Heart className={`h-4 w-4 mr-2 ${isBookmarked ? "fill-current" : ""}`} />
            {isBookmarked ? "Bookmarked" : "Bookmark Lab"}
          </Button>
        )}
      </div>

      {/* Lab Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="h-12 w-12 text-primary" />
              <div>
                <CardTitle className="text-3xl">{lab.name}</CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary">{lab.pricing_tier}</Badge>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-medium">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({reviews?.length || 0} reviews)
                    </span>
                  </div>
                  <Badge variant={lab.current_load < lab.max_capacity ? "default" : "destructive"}>
                    {lab.current_load < lab.max_capacity ? "Available" : "At Capacity"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {lab.description && (
            <p className="text-muted-foreground">{lab.description}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {lab.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{lab.address}</span>
              </div>
            )}
            {lab.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <a href={`tel:${lab.contact_phone}`} className="hover:underline">
                  {lab.contact_phone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <a href={`mailto:${lab.contact_email}`} className="hover:underline">
                {lab.contact_email}
              </a>
            </div>
            {lab.website_url && (
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <a href={lab.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Website
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>Standard: {lab.standard_sla_days} days</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>Urgent: {lab.urgent_sla_days} days</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>Capacity: {lab.current_load}/{lab.max_capacity}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Card */}
      {specializations && specializations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Services & Specializations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specializations.map((spec) => (
                <Card key={spec.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{spec.restoration_type}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {spec.turnaround_days} days turnaround
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {spec.expertise_level}
                        </Badge>
                      </div>
                      {spec.is_preferred && (
                        <Badge>Preferred</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos Gallery */}
      {photos && photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-video overflow-hidden rounded-lg">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || "Lab photo"}
                    className="object-cover w-full h-full"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submit Review */}
          {user && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Write a Review</h3>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Share your experience with this lab..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
              />
              <Button
                onClick={() => submitReview.mutate()}
                disabled={submitReview.isPending || !reviewText.trim()}
              >
                Submit Review
              </Button>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews && reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {review.profiles?.full_name || review.profiles?.email || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-muted-foreground">{review.review_text}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No reviews yet. Be the first to review this lab!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
