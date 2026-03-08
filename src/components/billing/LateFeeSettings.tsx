import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const LateFeeSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [feePercent, setFeePercent] = useState("0");

  // Get user's lab
  const { data: userLab } = useQuery({
    queryKey: ["user-lab-for-late-fee", user?.id],
    queryFn: async () => {
      const { data: role } = await supabase
        .from("user_roles")
        .select("lab_id")
        .eq("user_id", user?.id!)
        .eq("role", "lab_staff")
        .single();
      if (!role?.lab_id) return null;

      const { data: lab } = await supabase
        .from("labs")
        .select("id, late_fee_policy_percent")
        .eq("id", role.lab_id)
        .single();
      return lab;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (userLab?.late_fee_policy_percent != null) {
      setFeePercent(userLab.late_fee_policy_percent.toString());
    }
  }, [userLab]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!userLab?.id) throw new Error("Lab not found");
      const val = parseFloat(feePercent) || 0;
      if (val < 0 || val > 50) throw new Error("Fee must be between 0% and 50%");

      const { error } = await supabase
        .from("labs")
        .update({ late_fee_policy_percent: val })
        .eq("id", userLab.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-lab-for-late-fee"] });
      toast.success("Late fee policy updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!userLab) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Late Fee Policy
        </CardTitle>
        <CardDescription>
          Auto-applied penalty percentage when invoices become overdue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1">
            <Label htmlFor="late-fee">Late Fee Percentage (%)</Label>
            <Input
              id="late-fee"
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
            />
          </div>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Set to 0 to disable. Applied automatically when invoices pass their due date.
        </p>
      </CardContent>
    </Card>
  );
};

export default LateFeeSettings;
