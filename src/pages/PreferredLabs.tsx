import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { 
  Building2, 
  Star, 
  Heart,
  HeartOff,
  Plus,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { PreferredLabsList } from "@/components/preferred-labs/PreferredLabsList";
import { AvailableLabsList } from "@/components/preferred-labs/AvailableLabsList";

interface Lab {
  id: string;
  name: string;
  pricing_tier: string;
  performance_score: number;
}

interface PreferredLab {
  id: string;
  lab_id: string;
  priority_order: number;
  labs: Lab;
}

const PreferredLabs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedLab, setSelectedLab] = useState<string | null>(null);

  // Fetch user's preferred labs
  const { data: preferredLabs, isLoading: preferredLoading, refetch: refetchPreferred } = useQuery({
    queryKey: ["preferred-labs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("preferred_labs")
        .select(`
          id,
          lab_id,
          priority_order,
          labs (
            id,
            name,
            pricing_tier,
            performance_score
          )
        `)
        .eq("dentist_id", user.id)
        .order("priority_order");
      
      if (error) throw error;
      return data as PreferredLab[];
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: 'always',
  });

  // Fetch all available labs (not already in preferred)
  const { data: availableLabs, refetch: refetchAvailable } = useQuery({
    queryKey: ["available-labs-for-preference", user?.id, preferredLabs],
    queryFn: async () => {
      const preferredLabIds = preferredLabs?.map(p => p.lab_id) || [];
      
      let query = supabase
        .from("labs")
        .select("id, name, pricing_tier, performance_score")
        .eq("is_active", true)
        .order("performance_score", { ascending: false });
      
      if (preferredLabIds.length > 0) {
        query = query.not("id", "in", `(${preferredLabIds.join(",")})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Lab[];
    },
    enabled: !!user?.id && preferredLabs !== undefined,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Add preferred lab mutation
  const addPreferredMutation = useMutation({
    mutationFn: async (labId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const maxPriority = Math.max(0, ...(preferredLabs?.map(p => p.priority_order) || [0]));
      
      const { error } = await supabase
        .from("preferred_labs")
        .insert({
          dentist_id: user.id,
          lab_id: labId,
          priority_order: maxPriority + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferred-labs"] });
      queryClient.invalidateQueries({ queryKey: ["available-labs-for-preference"] });
      setSelectedLab(null);
      toast.success("Lab added to your preferred list");
    },
    onError: (error: Error) => {
      toast.error("Failed to add lab", { description: error.message });
    },
  });

  // Remove preferred lab mutation
  const removePreferredMutation = useMutation({
    mutationFn: async (preferredId: string) => {
      const { error } = await supabase
        .from("preferred_labs")
        .delete()
        .eq("id", preferredId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferred-labs"] });
      queryClient.invalidateQueries({ queryKey: ["available-labs-for-preference"] });
      toast.success("Lab removed from preferred list");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove lab", { description: error.message });
    },
  });

  // Reorder preferred labs mutation
  const reorderPreferredMutation = useMutation({
    mutationFn: async (reorderedLabs: PreferredLab[]) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Delete all current preferred labs for this user
      const { error: deleteError } = await supabase
        .from("preferred_labs")
        .delete()
        .eq("dentist_id", user.id);

      if (deleteError) throw deleteError;

      // Re-insert with new priority order
      const newPreferredLabs = reorderedLabs.map((lab, index) => ({
        dentist_id: user.id,
        lab_id: lab.lab_id,
        priority_order: index + 1,
      }));

      const { error: insertError } = await supabase
        .from("preferred_labs")
        .insert(newPreferredLabs);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferred-labs"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update order", { description: error.message });
    },
  });

  if (preferredLoading) {
    return (
      <ProtectedRoute>
        <LoadingScreen message="Loading preferred labs..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6 max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="mb-8">
              <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Preferred Labs</h1>
              <p className="text-muted-foreground">
                Your bookmarked labs. Orders can be auto-assigned to these labs based on priority.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Preferred Labs List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary fill-primary" />
                    My Preferred Labs
                  </CardTitle>
                  <CardDescription>
                    Your bookmarked labs ordered by priority
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {preferredLabs && preferredLabs.length > 0 ? (
                    <PreferredLabsList
                      preferredLabs={preferredLabs}
                      onRemove={(id) => removePreferredMutation.mutate(id)}
                      onReorder={(labs) => reorderPreferredMutation.mutate(labs)}
                    />
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <HeartOff className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-base sm:text-lg font-medium mb-2">No preferred labs yet</p>
                      <p className="text-sm text-muted-foreground">
                        Add labs from the available list to get started
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Available Labs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    Available Labs
                  </CardTitle>
                  <CardDescription>
                    Tap a lab to add it to your bookmarks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AvailableLabsList
                    availableLabs={availableLabs || []}
                    onAdd={(labId) => addPreferredMutation.mutate(labId)}
                    isAdding={addPreferredMutation.isPending}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <LandingFooter />
        <ScrollToTop />
      </div>
    </ProtectedRoute>
  );
};

export default PreferredLabs;
