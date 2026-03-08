import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, User, FileText, Palette, Activity, StickyNote, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrderNote {
  id: string;
  note_text: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    patient_name: string;
    doctor_name: string;
    status: string;
    urgency: string;
    created_at: string;
    restoration_type: string;
    teeth_number: string;
    teeth_shade: string;
    shade_system: string | null;
    biological_notes: string | null;
    handling_instructions?: string | null;
    approval_notes?: string | null;
    desired_delivery_date: string | null;
    assigned_lab: { name: string } | null;
    driver_name: string | null;
    driver_phone_whatsapp: string | null;
    carrier_name: string | null;
    carrier_phone: string | null;
  };
}

export function OrderDetailsModal({ open, onOpenChange, order }: OrderDetailsModalProps) {
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (!open || !order?.id) return;
    const fetchNotes = async () => {
      setLoadingNotes(true);
      try {
        const { data } = await supabase
          .from("order_notes")
          .select("id, note_text, created_at, profiles:user_id(full_name)")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false });
        setOrderNotes((data as unknown as OrderNote[]) || []);
      } catch {
        // silent
      } finally {
        setLoadingNotes(false);
      }
    };
    fetchNotes();
  }, [open, order?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "Ready for Delivery":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "In Progress":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const hasAnyNotes = order.biological_notes || order.handling_instructions || order.approval_notes || orderNotes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details - {order.order_number}
          </DialogTitle>
          <DialogDescription>
            Complete order information from creation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status & Urgency */}
          <div className="flex gap-2">
            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
            {order.urgency === "Urgent" && <Badge variant="destructive">Urgent</Badge>}
          </div>

          <Separator />

          {/* Patient Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Patient Name:</span>
                <p className="font-medium">{order.patient_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Order Created:</span>
                <p className="font-medium">{format(new Date(order.created_at), "PPp")}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Treatment Details */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Treatment Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Restoration Type:</span>
                <p className="font-medium">{order.restoration_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Teeth Number:</span>
                <p className="font-medium font-mono">{order.teeth_number}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shade Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Shade
            </h3>
            <div className="text-sm">
              <span className="text-muted-foreground">Teeth Shade:</span>
              <p className="font-medium">{order.teeth_shade}</p>
            </div>
          </div>

          {/* Notes Section */}
          {hasAnyNotes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </h3>
                <div className="space-y-3 text-sm">
                  {order.biological_notes && (
                    <div>
                      <span className="text-muted-foreground">Biological Notes:</span>
                      <p className="font-medium bg-muted p-3 rounded-lg mt-1">
                        {order.biological_notes}
                      </p>
                    </div>
                  )}
                  {order.handling_instructions && (
                    <div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-warning" />
                        Handling Instructions:
                      </span>
                      <p className="font-medium bg-warning/10 border border-warning/20 p-3 rounded-lg mt-1">
                        {order.handling_instructions}
                      </p>
                    </div>
                  )}
                  {order.approval_notes && (
                    <div>
                      <span className="text-muted-foreground">Approval Notes:</span>
                      <p className="font-medium bg-primary/5 border border-primary/10 p-3 rounded-lg mt-1">
                        {order.approval_notes}
                      </p>
                    </div>
                  )}

                  {/* Internal order notes from order_notes table */}
                  {orderNotes.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-muted-foreground">Internal Notes:</span>
                      {orderNotes.map((note) => (
                        <div key={note.id} className="bg-muted/50 border border-border p-3 rounded-lg">
                          <p className="font-medium">{note.note_text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {note.profiles?.full_name || "Unknown"} — {format(new Date(note.created_at), "PPp")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {loadingNotes && (
                    <p className="text-xs text-muted-foreground animate-pulse">Loading notes...</p>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Delivery & Lab Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Delivery & Lab
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {order.desired_delivery_date && (
                <div>
                  <span className="text-muted-foreground">Desired Delivery:</span>
                  <p className="font-medium">
                    {format(new Date(order.desired_delivery_date), "PPP")}
                  </p>
                </div>
              )}
              {order.assigned_lab && (
                <div>
                  <span className="text-muted-foreground">Assigned Lab:</span>
                  <p className="font-medium">{order.assigned_lab.name}</p>
                </div>
              )}
            </div>
            
            {/* Driver & Carrier Information */}
            {(order.driver_name || order.carrier_name) && (
              <>
                <Separator className="my-2" />
                <div className="space-y-3">
                  {order.driver_name && (
                    <div>
                      <span className="text-muted-foreground">Driver:</span>
                      <p className="font-medium">{order.driver_name}</p>
                      {order.driver_phone_whatsapp && (
                        <p className="text-sm text-muted-foreground mt-1">
                          📱 {order.driver_phone_whatsapp}
                        </p>
                      )}
                    </div>
                  )}
                  {order.carrier_name && (
                    <div>
                      <span className="text-muted-foreground">Carrier:</span>
                      <p className="font-medium">{order.carrier_name}</p>
                      {order.carrier_phone && (
                        <p className="text-sm text-muted-foreground mt-1">
                          📱 {order.carrier_phone}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
