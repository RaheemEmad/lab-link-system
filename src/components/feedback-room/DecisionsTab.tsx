import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Lock, Plus, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DecisionsTabProps {
  orderId: string;
}

const DecisionsTab = ({ orderId }: DecisionsTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [decisionType, setDecisionType] = useState("");
  const [decisionValue, setDecisionValue] = useState("");

  const { data: decisions, isLoading } = useQuery({
    queryKey: ["feedback-decisions", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_room_decisions")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching decisions:", error);
        throw error;
      }
      return data;
    },
    enabled: !!orderId,
  });

  const addDecisionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feedback_room_decisions").insert({
        order_id: orderId,
        decision_type: decisionType,
        decision_value: decisionValue,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-decisions", orderId] });
      setDecisionType("");
      setDecisionValue("");
      setShowAddForm(false);
      toast.success("Decision added");
    },
    onError: (error) => {
      console.error("Error adding decision:", error);
      toast.error("Failed to add decision");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading decisions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Add Decision</CardTitle>
            <Button
              variant={showAddForm ? "secondary" : "default"}
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {showAddForm ? "Cancel" : "Add"}
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4">
            <Input
              placeholder="Decision type (e.g., Shade, Material)"
              value={decisionType}
              onChange={(e) => setDecisionType(e.target.value)}
            />
            <Input
              placeholder="Decision value"
              value={decisionValue}
              onChange={(e) => setDecisionValue(e.target.value)}
            />
            <Button
              onClick={() => addDecisionMutation.mutate()}
              disabled={!decisionType.trim() || !decisionValue.trim() || addDecisionMutation.isPending}
            >
              {addDecisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Add Decision
            </Button>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!decisions || decisions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No decisions yet</p>
              <p className="text-sm">Lock important decisions to prevent changes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((decision) => (
                <div key={decision.id} className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">{decision.decision_type}</Badge>
                      <p className="font-medium">{decision.decision_value}</p>
                    </div>
                    {decision.is_locked && <Lock className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(decision.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DecisionsTab;
