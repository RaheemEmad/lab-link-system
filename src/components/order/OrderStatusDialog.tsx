import { useState, useEffect } from "react";
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
import { useUserRole } from "@/hooks/useUserRole";
import { AlertCircle } from "lucide-react";

type OrderStatus = "Pending" | "In Progress" | "Ready for QC" | "Ready for Delivery" | "Delivered" | "Cancelled";

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
  const { isLabStaff, isAdmin, isDoctor, roleConfirmed } = useUserRole();
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if user has permission (labs only)
  const hasPermission = roleConfirmed && (isLabStaff || isAdmin);

  // Close dialog if doctor opens it somehow
  useEffect(() => {
    if (open && roleConfirmed && isDoctor) {
      toast.error("Access Denied", {
        description: "Only laboratory staff can update order status",
      });
      onOpenChange(false);
    }
  }, [open, roleConfirmed, isDoctor, onOpenChange]);

  const handleUpdate = async () => {
    // Double-check permission before update
    if (!hasPermission) {
      toast.error("Access Denied", {
        description: "Only laboratory staff can update order status",
      });
      onOpenChange(false);
      return;
    }

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

  // Don't render dialog for doctors at all
  if (roleConfirmed && isDoctor) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Change the status for order <span className="font-mono font-semibold">{orderNumber}</span>
          </DialogDescription>
        </DialogHeader>

        {!hasPermission && roleConfirmed ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">
              Only laboratory staff can update order status.
            </p>
          </div>
        ) : (
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
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating} className="w-full sm:w-auto">
            Cancel
          </Button>
          {hasPermission && (
            <Button onClick={handleUpdate} disabled={isUpdating} className="w-full sm:w-auto">
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
