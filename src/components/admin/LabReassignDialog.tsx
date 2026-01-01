import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Lab {
  id: string;
  name: string;
  is_active: boolean;
}

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  assigned_lab_id: string | null;
  assigned_lab?: { name: string } | null;
}

interface LabReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess: () => void;
}

export const LabReassignDialog = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}: LabReassignDialogProps) => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLabId, setSelectedLabId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingLabs, setFetchingLabs] = useState(true);

  useEffect(() => {
    if (open) {
      fetchLabs();
    }
  }, [open]);

  const fetchLabs = async () => {
    try {
      setFetchingLabs(true);
      const { data, error } = await supabase
        .from("labs")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setLabs(data || []);
    } catch (error) {
      toast.error("Failed to load labs");
    } finally {
      setFetchingLabs(false);
    }
  };

  const handleReassign = async () => {
    if (!order) return;

    try {
      setLoading(true);

      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Unauthorized");
        return;
      }

      const isMarketplace = selectedLabId === "marketplace";
      const newLabId = isMarketplace ? null : selectedLabId;

      // Delete existing order assignments for this order
      const { error: deleteAssignError } = await supabase
        .from("order_assignments")
        .delete()
        .eq("order_id", order.id);

      if (deleteAssignError) {
        console.error("Failed to delete old assignments:", deleteAssignError);
      }

      // Update the order
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          assigned_lab_id: newLabId,
          auto_assign_pending: isMarketplace,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // Create new order_assignments for lab staff if assigning to a lab
      if (!isMarketplace && newLabId) {
        const { data: labStaff, error: staffError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("lab_id", newLabId)
          .eq("role", "lab_staff");

        if (staffError) {
          console.error("Failed to fetch lab staff:", staffError);
        } else if (labStaff && labStaff.length > 0) {
          const assignments = labStaff.map((staff) => ({
            order_id: order.id,
            user_id: staff.user_id,
            assigned_by: user.id,
          }));

          const { error: assignError } = await supabase
            .from("order_assignments")
            .insert(assignments);

          if (assignError) {
            console.error("Failed to create assignments:", assignError);
          }
        }
      }

      // Log the change to order_status_history
      const oldLabName = order.assigned_lab?.name || "Marketplace";
      const newLabName = isMarketplace
        ? "Marketplace"
        : labs.find((l) => l.id === selectedLabId)?.name || "Unknown Lab";

      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: order.id,
          changed_by: user.id,
          old_status: "Pending" as any, // Keep status the same
          new_status: "Pending" as any,
          notes: `Lab reassigned by admin from "${oldLabName}" to "${newLabName}"`,
        });

      if (historyError) {
        console.error("Failed to log status history:", historyError);
      }

      toast.success(
        `Order ${order.order_number} reassigned to ${newLabName}`
      );
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Failed to reassign lab";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const currentLabDisplay = order?.assigned_lab?.name || "Marketplace (Unassigned)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reassign Lab for Order</DialogTitle>
          <DialogDescription>
            Change the lab assignment for this order. This action will be logged in the audit trail.
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Order:</span>
                <Badge variant="outline">{order.order_number}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Patient:</span>
                <span className="text-sm">{order.patient_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Lab:</span>
                <Badge variant={order.assigned_lab_id ? "default" : "secondary"}>
                  {currentLabDisplay}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="lab-select" className="text-sm font-medium">
                Select New Lab:
              </label>
              <Select
                value={selectedLabId}
                onValueChange={setSelectedLabId}
                disabled={fetchingLabs}
              >
                <SelectTrigger id="lab-select">
                  <SelectValue placeholder="Choose a lab..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketplace">
                    Marketplace (Auto-Assign)
                  </SelectItem>
                  {labs.map((lab) => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedLabId || loading || fetchingLabs}
          >
            {loading ? "Reassigning..." : "Reassign Lab"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
