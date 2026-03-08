import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLayout from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Trash2, Play, Loader2, BookTemplate } from "lucide-react";
import { toast } from "sonner";

const TemplatesLibrary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["order-templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_templates")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_favorite", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-templates"] });
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("order_templates")
        .update({ is_favorite: !isFavorite, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order-templates"] }),
    onError: () => toast.error("Failed to update template"),
  });

  return (
    <ProtectedRoute>
      <PageLayout bgClass="bg-secondary/30" maxWidth="max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 w-fit">
          <ArrowLeft className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookTemplate className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Order Templates</h1>
          </div>
          <Button onClick={() => navigate("/new-order")} size="sm">
            New Order
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !templates || templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookTemplate className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No templates yet.</p>
              <p className="text-muted-foreground text-xs mt-1">
                Submit an order and save it as a template to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => favoriteMutation.mutate({ id: t.id, isFavorite: t.is_favorite ?? false })}
                      className="flex-shrink-0"
                    >
                      <Star
                        className={`h-4 w-4 transition-colors ${
                          t.is_favorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground hover:text-amber-400"
                        }`}
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{t.restoration_type || "—"}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {t.teeth_number || "No teeth"} · {t.teeth_shade || "No shade"}
                        </span>
                        {(t.use_count ?? 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground">· Used {t.use_count}×</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => navigate(`/new-order?fromTemplate=${t.id}`)}
                    >
                      <Play className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => deleteMutation.mutate(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageLayout>
    </ProtectedRoute>
  );
};

export default TemplatesLibrary;
