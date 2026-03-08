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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createNotifications } from "@/lib/notifications";
import { CheckCircle2, AlertTriangle, Package, BookmarkPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DeliveryConfirmationDialogProps {
  orderId: string;
  orderNumber: string;
  patientName: string;
  labName?: string;
  restorationData?: {
    restoration_type?: string;
    teeth_number?: string;
    teeth_shade?: string;
    shade_system?: string;
    biological_notes?: string;
    assigned_lab_id?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}

export const DeliveryConfirmationDialog = ({
  orderId,
  orderNumber,
  patientName,
  labName,
  restorationData,
  open,
  onOpenChange,
  onConfirmed,
}: DeliveryConfirmationDialogProps) => {
  const { user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [saveAsCase, setSaveAsCase] = useState(true);

  const handleConfirmDelivery = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setIsConfirming(true);
    try {
      // Update order status to Delivered and clear pending confirmation
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "Delivered",
          delivery_pending_confirmation: false,
          delivery_confirmed_at: new Date().toISOString(),
          delivery_confirmed_by: user.id,
          actual_delivery_date: new Date().toISOString().split('T')[0],
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Get the assigned lab staff to notify them
      const { data: assignments } = await supabase
        .from("order_assignments")
        .select("user_id")
        .eq("order_id", orderId);

      // Create notification for lab staff
      if (assignments && assignments.length > 0) {
        await createNotifications(assignments.map((assignment) => ({
          user_id: assignment.user_id,
          order_id: orderId,
          type: "delivery_confirmed",
          title: "Delivery Confirmed",
          message: `Doctor has confirmed delivery of Order #${orderNumber}`,
        })));
      }

      toast.success("Delivery confirmed!", {
        description: `Order #${orderNumber} has been marked as delivered.`,
      });

      // Optionally save as patient case
      if (saveAsCase && restorationData?.restoration_type && restorationData?.teeth_number && restorationData?.teeth_shade) {
        // Check if case already exists for this patient
        const { data: existing } = await supabase
          .from("patient_cases")
          .select("id, order_count")
          .eq("doctor_id", user.id)
          .eq("patient_name", patientName)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("patient_cases")
            .update({
              last_order_id: orderId,
              order_count: (existing.order_count || 1) + 1,
              restoration_type: restorationData.restoration_type,
              teeth_number: restorationData.teeth_number,
              teeth_shade: restorationData.teeth_shade,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("patient_cases").insert({
            doctor_id: user.id,
            patient_name: patientName,
            restoration_type: restorationData.restoration_type,
            teeth_number: restorationData.teeth_number,
            teeth_shade: restorationData.teeth_shade,
            shade_system: restorationData.shade_system || null,
            biological_notes: restorationData.biological_notes || null,
            preferred_lab_id: restorationData.assigned_lab_id || null,
            last_order_id: orderId,
          });
        }
      }

      onConfirmed();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to confirm delivery:", error);
      toast.error("Failed to confirm delivery", {
        description: error.message,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReportIssue = async () => {
    if (!user || !issueNote.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setIsReportingIssue(true);
    try {
      // Add a note about the issue
      await supabase.from("order_notes").insert({
        order_id: orderId,
        user_id: user.id,
        note_text: `⚠️ DELIVERY ISSUE REPORTED: ${issueNote.trim()}`,
      });

      // Get lab staff to notify them
      const { data: assignments } = await supabase
        .from("order_assignments")
        .select("user_id")
        .eq("order_id", orderId);

      if (assignments && assignments.length > 0) {
        await createNotifications(assignments.map((assignment) => ({
          user_id: assignment.user_id,
          order_id: orderId,
          type: "delivery_issue",
          title: "Delivery Issue Reported",
          message: `Doctor reported an issue with Order #${orderNumber}: ${issueNote.slice(0, 100)}...`,
        })));
      }

      toast.warning("Issue reported", {
        description: "The lab has been notified about your concern.",
      });

      setIssueNote("");
      setShowIssueForm(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to report issue:", error);
      toast.error("Failed to report issue", {
        description: error.message,
      });
    } finally {
      setIsReportingIssue(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Confirm Delivery
          </DialogTitle>
          <DialogDescription>
            The lab has marked this order as delivered. Please confirm you have received it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order</span>
              <span className="font-mono font-semibold">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Patient</span>
              <span className="font-medium">{patientName}</span>
            </div>
            {labName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lab</span>
                <span className="font-medium">{labName}</span>
              </div>
            )}
          </div>

          {showIssueForm ? (
            <div className="space-y-3">
              <Label htmlFor="issue-note">Describe the issue</Label>
              <Textarea
                id="issue-note"
                placeholder="What's wrong with the delivery? (e.g., missing items, wrong order, quality issues)"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIssueForm(false)}
                  disabled={isReportingIssue}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReportIssue}
                  disabled={isReportingIssue || !issueNote.trim()}
                >
                  {isReportingIssue ? "Reporting..." : "Submit Issue"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              By confirming, you acknowledge that you have received the dental work and it meets initial expectations.
            </p>
          )}
        </div>

        {!showIssueForm && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowIssueForm(true)}
              disabled={isConfirming}
              className="w-full sm:w-auto"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
            <Button
              onClick={handleConfirmDelivery}
              disabled={isConfirming}
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isConfirming ? "Confirming..." : "Confirm Delivery"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
