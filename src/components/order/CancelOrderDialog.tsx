import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { XCircle, AlertTriangle } from "lucide-react";
import { createNotification } from "@/lib/notifications";

interface CancelOrderDialogProps {
  orderId: string;
  orderNumber: string;
  userRole: 'doctor' | 'lab';
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CancelOrderDialog({ 
  orderId, 
  orderNumber, 
  userRole, 
  trigger,
  onSuccess 
}: CancelOrderDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Insert cancellation record
      const { error: cancellationError } = await supabase
        .from("order_cancellations")
        .insert({
          order_id: orderId,
          cancelled_by: user.id,
          cancelled_by_role: userRole,
          reason: reason.trim() || null,
        });

      if (cancellationError) throw cancellationError;

      // Update order status to Cancelled
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: "Cancelled",
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Log status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          old_status: null, // Will be filled by trigger or we can fetch current
          new_status: "Cancelled",
          changed_by: user.id,
          notes: `Cancelled by ${userRole}: ${reason.trim() || 'No reason provided'}`,
        });

      // Don't throw on history error, it's not critical
      if (historyError) {
        console.error("Failed to log status history:", historyError);
      }
    },
    onSuccess: async () => {
      // Fetch order details for notifications
      const { data: orderData } = await supabase
        .from("orders")
        .select("doctor_id, assigned_lab_id")
        .eq("id", orderId)
        .single();

      // Get all lab staff for the assigned lab (if any)
      const notifiedUserIds = new Set<string>();

      if (orderData?.assigned_lab_id) {
        // Notify all lab staff at this lab
        const { data: labStaff } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("lab_id", orderData.assigned_lab_id)
          .eq("role", "lab_staff");

        for (const staff of labStaff || []) {
          if (staff.user_id !== user?.id) {
            notifiedUserIds.add(staff.user_id);
            await createNotification({
              user_id: staff.user_id,
              order_id: orderId,
              type: "order_cancelled",
              title: "Order Cancelled",
              message: `Order ${orderNumber} has been cancelled by the ${userRole}.`,
            });
          }
        }
      }

      // Also notify via order_assignments (deduplicate)
      const { data: assignments } = await supabase
        .from("order_assignments")
        .select("user_id")
        .eq("order_id", orderId);

      for (const a of assignments || []) {
        if (!notifiedUserIds.has(a.user_id) && a.user_id !== user?.id) {
          notifiedUserIds.add(a.user_id);
          await createNotification({
            user_id: a.user_id,
            order_id: orderId,
            type: "order_cancelled",
            title: "Order Cancelled",
            message: `Order ${orderNumber} has been cancelled by the ${userRole}.`,
          });
        }
      }

      // Notify doctor (if lab cancelled)
      if (userRole === 'lab' && orderData?.doctor_id) {
        await createNotification({
          user_id: orderData.doctor_id,
          order_id: orderId,
          type: "order_cancelled",
          title: "Order Cancelled",
          message: `Order ${orderNumber} has been cancelled by the lab.`,
        });
      }

      // Notify doctor (if doctor cancelled, no need — they initiated it)

      toast({
        title: "Order Cancelled",
        description: `Order ${orderNumber} has been cancelled.`,
      });
      setOpen(false);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to cancel order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Order
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Order {orderNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This action cannot be undone. The order will be marked as cancelled and
              {userRole === 'lab' ? (
                <span className="text-destructive font-medium">
                  {" "}this may affect your lab's cancellation rate and badges.
                </span>
              ) : (
                " you will need to create a new order if needed."
              )}
            </p>
            
            <div className="space-y-2 pt-2">
              <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Please provide a reason for cancelling this order..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>
            Keep Order
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              cancelMutation.mutate();
            }}
            disabled={cancelMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel Order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}