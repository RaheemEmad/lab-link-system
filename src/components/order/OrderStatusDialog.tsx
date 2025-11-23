import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type OrderStatus = "Pending" | "In Progress" | "Ready for QC" | "Ready for Delivery" | "Delivered";

interface OrderStatusDialogProps {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
}

const statusOptions: OrderStatus[] = [
  "Pending",
  "In Progress",
  "Ready for QC",
  "Ready for Delivery",
  "Delivered",
];

export const OrderStatusDialog = ({
  orderId,
  orderNumber,
  currentStatus,
  open,
  onOpenChange,
  onStatusUpdated,
}: OrderStatusDialogProps) => {
  const { user } = useAuth();
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (newStatus === currentStatus) {
      toast.info("Status unchanged");
      onOpenChange(false);
      return;
    }

    if (!user) {
      toast.error("You must be logged in to update order status");
      return;
    }

    setIsUpdating(true);

    try {
      // Update the order status
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Insert status history record
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          old_status: currentStatus,
          new_status: newStatus,
          changed_by: user.id,
        });

      if (historyError) throw historyError;

      toast.success("Order status updated", {
        description: `${orderNumber} is now ${newStatus}`,
      });

      onStatusUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update status", {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change the status for order <span className="font-mono font-semibold">{orderNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
              {currentStatus}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">New Status *</Label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
              <SelectTrigger id="new-status">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
