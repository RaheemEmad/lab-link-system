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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw } from "lucide-react";
import { createNotifications } from "@/lib/notifications";
interface RestoreOrderDialogProps {
  orderId: string;
  orderNumber: string;
  preDeleteStatus: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RestoreOrderDialog({
  orderId,
  orderNumber,
  preDeleteStatus,
  open,
  onOpenChange,
  onSuccess,
}: RestoreOrderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const restoredStatus = (preDeleteStatus || "Pending") as "Pending" | "In Progress" | "Ready for QC" | "Ready for Delivery" | "Delivered" | "Cancelled";

      const { error } = await supabase
        .from("orders")
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          pre_delete_status: null,
          status: restoredStatus,
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      // Log to status history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        old_status: "Cancelled" as const,
        new_status: restoredStatus,
        changed_by: user.id,
        notes: `Order restored by doctor. Previous status: ${restoredStatus}`,
      });
    },
    onSuccess: () => {
      toast({
        title: "Order Restored",
        description: `Order ${orderNumber} has been restored to its previous status.`,
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-orders"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to restore order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Restore Order {orderNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the order to its previous status
            {preDeleteStatus ? (
              <span className="font-medium"> ({preDeleteStatus})</span>
            ) : (
              <span className="font-medium"> (Pending)</span>
            )}
            . The order will reappear in your active orders list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={restoreMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              restoreMutation.mutate();
            }}
            disabled={restoreMutation.isPending}
          >
            {restoreMutation.isPending ? "Restoring..." : "Yes, Restore Order"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
