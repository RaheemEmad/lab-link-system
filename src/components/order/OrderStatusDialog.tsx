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
      // Special handling for "Delivered" status - requires doctor confirmation
      if (newStatus === "Delivered") {
        // Get the order's doctor_id to notify them
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("doctor_id")
          .eq("id", orderId)
          .single();

        if (orderError) throw orderError;

        // Set pending confirmation flag instead of directly updating to Delivered
        const { error: updateError } = await supabase
          .from("orders")
          .update({ 
            delivery_pending_confirmation: true,
            status_updated_at: new Date().toISOString()
          })
          .eq("id", orderId);

        if (updateError) throw updateError;

        // Create notification for doctor
        if (order?.doctor_id) {
          await supabase.from("notifications").insert({
            user_id: order.doctor_id,
            order_id: orderId,
            type: "delivery_confirmation_request",
            title: "Delivery Confirmation Requested",
            message: `Lab has marked Order #${orderNumber} as delivered. Please confirm receipt.`,
          });
        }

        toast.success("Delivery confirmation sent", {
          description: `Awaiting doctor confirmation for ${orderNumber}`,
        });
      } else {
        // Normal status update for other statuses
        const { error: updateError } = await supabase
          .from("orders")
          .update({ 
            status: newStatus,
            status_updated_at: new Date().toISOString()
          })
          .eq("id", orderId);

        if (updateError) throw updateError;

        toast.success("Order status updated", {
          description: `${orderNumber} is now ${newStatus}`,
        });
      }

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
