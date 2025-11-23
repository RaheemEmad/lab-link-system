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
import { 
  Building2, 
  Star, 
  Heart,
  HeartOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const { data: preferredLabs, isLoading: preferredLoading } = useQuery({
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
  });

  // Fetch all available labs (not already in preferred)
  const { data: availableLabs } = useQuery({
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

  // Update priority mutation
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, newPriority }: { id: string; newPriority: number }) => {
      const { error } = await supabase
        .from("preferred_labs")
        .update({ priority_order: newPriority })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferred-labs"] });
      toast.success("Priority updated");
    },
  });

  const movePriority = async (index: number, direction: 'up' | 'down') => {
    if (!preferredLabs) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= preferredLabs.length) return;

    const currentItem = preferredLabs[index];
    const swapItem = preferredLabs[newIndex];

    await Promise.all([
      updatePriorityMutation.mutateAsync({ 
        id: currentItem.id, 
        newPriority: swapItem.priority_order 
      }),
      updatePriorityMutation.mutateAsync({ 
        id: swapItem.id, 
        newPriority: currentItem.priority_order 
      }),
    ]);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container px-4 max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="mb-8">
              <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold mb-2">Preferred Labs</h1>
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
                    Drag to reorder priority (1 = highest priority)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {preferredLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading...
                    </div>
                  ) : preferredLabs && preferredLabs.length > 0 ? (
                    <div className="space-y-3">
                      {preferredLabs.map((pref, index) => (
                        <Card key={pref.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    Priority {index + 1}
                                  </Badge>
                                  <span className="font-medium">{pref.labs.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="text-xs">
                                    {pref.labs.pricing_tier}
                                  </Badge>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                    <span>{pref.labs.performance_score?.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => movePriority(index, 'up')}
                                  disabled={index === 0}
                                  className="h-8 w-8 p-0"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => movePriority(index, 'down')}
                                  disabled={index === preferredLabs.length - 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Preferred Lab</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {pref.labs.name} from your preferred labs?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => removePreferredMutation.mutate(pref.id)}
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <HeartOff className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No preferred labs yet</p>
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
                    Select a lab to add to your preferred list
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableLabs && availableLabs.length > 0 ? (
                    <div className="space-y-2">
                      {availableLabs.map((lab) => (
                        <Card 
                          key={lab.id}
                          className={`cursor-pointer transition-colors ${
                            selectedLab === lab.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                          }`}
                          onClick={() => setSelectedLab(lab.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1">{lab.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="text-xs">
                                    {lab.pricing_tier}
                                  </Badge>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                    <span>{lab.performance_score?.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                              {selectedLab === lab.id && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addPreferredMutation.mutate(lab.id);
                                  }}
                                  disabled={addPreferredMutation.isPending}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>All available labs have been added to your preferred list</p>
                    </div>
                  )}
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
