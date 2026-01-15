import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ChecklistItem from "./ChecklistItem";

interface ChecklistTabProps {
  orderId: string;
}

const ChecklistTab = ({ orderId }: ChecklistTabProps) => {
  const { user } = useAuth();
  const { isDoctor, isLabStaff } = useUserRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");

  const { data: checklistItems, isLoading } = useQuery({
    queryKey: ["feedback-checklist", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_room_checklist_items")
        .select(`
          *,
          doctor_profile:profiles!feedback_room_checklist_items_doctor_confirmed_by_fkey(full_name),
          lab_profile:profiles!feedback_room_checklist_items_lab_confirmed_by_fkey(full_name)
        `)
        .eq("order_id", orderId)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching checklist:", error);
        throw error;
      }
      return data;
    },
    enabled: !!orderId,
  });

  const logActivity = async (actionType: string, description: string, metadata?: Record<string, string | number | boolean>) => {
    if (!user?.id) return;
    
    const userRole = isDoctor ? "doctor" : isLabStaff ? "lab_staff" : "unknown";
    
    try {
      await supabase.rpc("log_feedback_activity", {
        p_order_id: orderId,
        p_user_id: user.id,
        p_user_role: userRole,
        p_action_type: actionType,
        p_action_description: description,
        p_metadata: (metadata || null) as never
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = checklistItems?.reduce(
        (max, item) => Math.max(max, item.display_order || 0),
        0
      ) || 0;

      const { error } = await supabase
        .from("feedback_room_checklist_items")
        .insert({
          order_id: orderId,
          item_name: newItemName,
          item_description: newItemDescription || null,
          display_order: maxOrder + 1,
        });

      if (error) throw error;
      return newItemName;
    },
    onSuccess: (itemName) => {
      queryClient.invalidateQueries({ queryKey: ["feedback-checklist", orderId] });
      logActivity("checklist_item_added", `Added checklist item: ${itemName}`, { item_name: itemName });
      setNewItemName("");
      setNewItemDescription("");
      setShowAddForm(false);
      toast.success("Checklist item added");
    },
    onError: (error) => {
      console.error("Error adding item:", error);
      toast.error("Failed to add checklist item");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ itemId, role, itemName }: { itemId: string; role: "doctor" | "lab"; itemName: string }) => {
      const updateData =
        role === "doctor"
          ? {
              doctor_confirmed: true,
              doctor_confirmed_by: user?.id,
              doctor_confirmed_at: new Date().toISOString(),
            }
          : {
              lab_confirmed: true,
              lab_confirmed_by: user?.id,
              lab_confirmed_at: new Date().toISOString(),
            };

      const { error } = await supabase
        .from("feedback_room_checklist_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;
      return { role, itemName };
    },
    onSuccess: ({ role, itemName }) => {
      queryClient.invalidateQueries({ queryKey: ["feedback-checklist", orderId] });
      logActivity("checklist_item_confirmed", `${role === "doctor" ? "Doctor" : "Lab"} confirmed: ${itemName}`, { item_name: itemName, confirmed_by: role });
      toast.success("Item confirmed");
    },
    onError: (error) => {
      console.error("Error confirming item:", error);
      toast.error("Failed to confirm item");
    },
  });

  // Calculate progress
  const totalItems = checklistItems?.length || 0;
  const confirmedItems =
    checklistItems?.filter((item) => item.doctor_confirmed && item.lab_confirmed).length || 0;
  const progressPercent = totalItems > 0 ? (confirmedItems / totalItems) * 100 : 0;

  // Can add items: both doctors AND lab staff
  const canAddItems = isDoctor || isLabStaff;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading checklist...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      {totalItems > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {confirmedItems} / {totalItems} completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Add Item Section (Both Doctors AND Lab Staff) */}
      {canAddItems && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Add Checklist Item</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {isDoctor ? "Add requirements for the lab" : "Add items for quality tracking"}
                </CardDescription>
              </div>
              <Button
                variant={showAddForm ? "secondary" : "default"}
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? "Cancel" : "Add Item"}
              </Button>
            </div>
          </CardHeader>
          {showAddForm && (
            <CardContent className="space-y-4">
              <Input
                placeholder="Item name *"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                rows={2}
              />
              <Button
                onClick={() => addItemMutation.mutate()}
                disabled={!newItemName.trim() || addItemMutation.isPending}
              >
                {addItemMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Item"
                )}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Checklist Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Quality Checklist
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} items)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!checklistItems || checklistItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No checklist items yet</p>
              <p className="text-sm">
                {canAddItems
                  ? "Add items to track quality requirements"
                  : "Checklist items will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  isDoctor={isDoctor}
                  isLabStaff={isLabStaff}
                  onConfirm={(itemId, role) =>
                    confirmMutation.mutate({ itemId, role, itemName: item.item_name })
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChecklistTab;
