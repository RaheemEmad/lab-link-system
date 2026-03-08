import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderNotes } from "@/components/order/OrderNotes";
import {
  CalendarIcon, Package, Phone, Truck, MapPin, User,
  AlertTriangle, FileText, MessageSquare, Stethoscope,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const shipmentSchema = z.object({
  proposedDeliveryDate: z.date().optional(),
  deliveryDateComment: z.string().optional(),
  carrierName: z.string().optional(),
  carrierPhone: z.string().optional(),
  shipmentTracking: z.string().optional(),
  driverName: z.string().optional(),
  driverPhoneWhatsapp: z.string().optional(),
  pickupTime: z.string().optional(),
  trackingLocation: z.string().optional(),
  shipmentNotes: z.string().optional(),
});

type ShipmentFormValues = z.infer<typeof shipmentSchema>;

interface ShipmentDetailModalOrder {
  id: string;
  order_number: string;
  patient_name: string;
  doctor_name?: string;
  status?: string;
  urgency?: string;
  restoration_type?: string;
  teeth_number?: string;
  teeth_shade?: string;
  shade_system?: string | null;
  biological_notes?: string | null;
  handling_instructions?: string | null;
  approval_notes?: string | null;
  desired_delivery_date?: string | null;
  proposed_delivery_date?: string | null;
  delivery_date_comment?: string | null;
  carrier_name?: string | null;
  carrier_phone?: string | null;
  shipment_tracking?: string | null;
  driver_name?: string | null;
  driver_phone_whatsapp?: string | null;
  pickup_time?: string | null;
  tracking_location?: string | null;
  shipment_notes?: string | null;
  assigned_lab?: { name: string } | null;
  created_at?: string;
}

interface ShipmentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ShipmentDetailModalOrder;
  onUpdate?: () => void;
  userRole?: string;
  defaultTab?: "order" | "shipment" | "notes";
}

export function ShipmentDetailModal({
  open,
  onOpenChange,
  order,
  onUpdate,
  userRole,
  defaultTab = "order",
}: ShipmentDetailModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isLabStaff = userRole === "lab_staff";
  const canEditShipment = isLabStaff;

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      proposedDeliveryDate: order.proposed_delivery_date ? new Date(order.proposed_delivery_date) : undefined,
      deliveryDateComment: order.delivery_date_comment || "",
      carrierName: order.carrier_name || "",
      carrierPhone: order.carrier_phone || "",
      shipmentTracking: order.shipment_tracking || "",
      driverName: order.driver_name || "",
      driverPhoneWhatsapp: order.driver_phone_whatsapp || "",
      pickupTime: order.pickup_time ? new Date(order.pickup_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
      trackingLocation: order.tracking_location || "",
      shipmentNotes: order.shipment_notes || "",
    },
  });

  // Reset editing state when modal closes
  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  const onSubmit = async (values: ShipmentFormValues) => {
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("orders")
        .update({
          proposed_delivery_date: values.proposedDeliveryDate?.toISOString().split("T")[0],
          delivery_date_comment: values.deliveryDateComment,
          carrier_name: values.carrierName,
          carrier_phone: values.carrierPhone,
          shipment_tracking: values.shipmentTracking,
          driver_name: values.driverName,
          driver_phone_whatsapp: values.driverPhoneWhatsapp,
          pickup_time: values.pickupTime ? new Date(`1970-01-01T${values.pickupTime}`).toISOString() : null,
          tracking_location: values.trackingLocation,
          shipment_notes: values.shipmentNotes,
        })
        .eq("id", order.id);

      if (error) {
        if (error.message.includes("row-level security") || error.message.includes("permission")) {
          throw new Error("You don't have permission to update this order.");
        }
        throw error;
      }

      const noteText = `Shipment details updated:\n📦 Carrier: ${values.carrierName}\n📞 Phone: ${values.carrierPhone}` +
        (values.proposedDeliveryDate ? `\n📅 Delivery: ${format(values.proposedDeliveryDate, "PPP")}` : "") +
        (values.shipmentTracking ? `\n🔍 Tracking: ${values.shipmentTracking}` : "");

      await supabase.from("order_notes").insert({ order_id: order.id, user_id: user.id, note_text: noteText });

      const { data: orderData } = await supabase.from("orders").select("doctor_id").eq("id", order.id).single();
      if (orderData?.doctor_id) {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: { orderId: order.id, type: "shipment_update", message: `Shipment updated for ${order.order_number}` },
          });
        } catch (e) { console.error("Notification error:", e); }
      }

      toast.success("Shipment details updated");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating shipment:", error);
      toast.error("Failed to update shipment details");
    } finally {
      setLoading(false);
    }
  };

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium break-words">{value}</p>
        </div>
      </div>
    );
  };

  const hasShipmentData = !!(
    order.proposed_delivery_date || order.carrier_name || order.carrier_phone ||
    order.shipment_tracking || order.driver_name || order.driver_phone_whatsapp ||
    order.pickup_time || order.tracking_location || order.shipment_notes || order.delivery_date_comment
  );

  const ShipmentDisplayView = () => {
    if (!hasShipmentData) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="rounded-full bg-muted p-4">
            <Truck className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No shipment details yet</p>
            <p className="text-xs text-muted-foreground mt-1">Shipment information will appear here once added.</p>
          </div>
          {canEditShipment && (
            <Button size="sm" onClick={() => setIsEditing(true)} className="mt-2">
              <Package className="h-3.5 w-3.5 mr-1.5" /> Add Shipment Details
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Delivery Schedule */}
        {(order.desired_delivery_date || order.proposed_delivery_date || order.delivery_date_comment) && (
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <CalendarIcon className="h-4 w-4 text-primary" /> Delivery Schedule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <DetailRow label="Desired Delivery" value={order.desired_delivery_date ? format(new Date(order.desired_delivery_date), "PPP") : null} icon={CalendarIcon} />
              <DetailRow label="Proposed Delivery" value={order.proposed_delivery_date ? format(new Date(order.proposed_delivery_date), "PPP") : null} icon={CalendarIcon} />
            </div>
            {order.delivery_date_comment && (
              <div className="mt-2 bg-secondary/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Date Comment</p>
                <p className="text-sm">{order.delivery_date_comment}</p>
              </div>
            )}
          </div>
        )}

        {/* Carrier & Driver */}
        {(order.carrier_name || order.carrier_phone || order.driver_name || order.driver_phone_whatsapp) && (
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-primary" /> Carrier & Driver
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <DetailRow label="Carrier" value={order.carrier_name} icon={Truck} />
              <DetailRow label="Carrier Phone" value={order.carrier_phone} icon={Phone} />
              <DetailRow label="Driver" value={order.driver_name} icon={User} />
              {order.driver_phone_whatsapp ? (
                <div className="flex items-start gap-3 py-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Driver WhatsApp</p>
                    <a
                      href={`https://wa.me/${order.driver_phone_whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {order.driver_phone_whatsapp}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Tracking */}
        {(order.shipment_tracking || order.pickup_time || order.tracking_location || order.shipment_notes) && (
          <div className="rounded-lg border bg-card p-4 space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" /> Tracking
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {order.shipment_tracking && (
                <div className="flex items-start gap-3 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Tracking Number</p>
                    <p className="text-sm font-medium font-mono break-all">{order.shipment_tracking}</p>
                  </div>
                </div>
              )}
              <DetailRow label="Pickup Time" value={order.pickup_time ? new Date(order.pickup_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : null} icon={CalendarIcon} />
              <DetailRow label="Current Location" value={order.tracking_location} icon={MapPin} />
            </div>
            {order.shipment_notes && (
              <div className="mt-2 bg-secondary/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Shipment Notes</p>
                <p className="text-sm">{order.shipment_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const ShipmentEditForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" /> Delivery Schedule
          </h4>
          {order.desired_delivery_date && (
            <div className="bg-secondary/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Doctor's Desired Date</p>
              <p className="text-sm font-medium">{format(new Date(order.desired_delivery_date), "PPP")}</p>
            </div>
          )}
          <FormField control={form.control} name="proposedDeliveryDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-xs">Proposed Delivery Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal h-9 text-sm", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : "Pick a date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="deliveryDateComment" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Date Comment</FormLabel>
              <FormControl><Textarea placeholder="Reason for different date..." className="resize-none h-16 text-sm" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Carrier & Driver
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="carrierName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Carrier</FormLabel>
                <FormControl><Input placeholder="FedEx, UPS..." className="h-9 text-sm" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="carrierPhone" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Carrier Phone</FormLabel>
                <FormControl><Input placeholder="Contact number" className="h-9 text-sm" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="driverName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Driver</FormLabel>
                <FormControl><Input placeholder="Driver name" className="h-9 text-sm" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="driverPhoneWhatsapp" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Driver WhatsApp</FormLabel>
                <FormControl><Input placeholder="WhatsApp number" className="h-9 text-sm" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Tracking
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="shipmentTracking" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Tracking Number</FormLabel>
                <FormControl><Input placeholder="Tracking #" className="h-9 text-sm font-mono" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="pickupTime" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Pickup Time</FormLabel>
                <FormControl><Input type="time" className="h-9 text-sm" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="trackingLocation" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Current Location</FormLabel>
              <FormControl><Input placeholder="Last known location" className="h-9 text-sm" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="shipmentNotes" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Shipment Notes</FormLabel>
              <FormControl><Textarea placeholder="Special handling instructions..." className="resize-none h-16 text-sm" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>Cancel</Button>
          <Button type="submit" size="sm" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-4 sm:px-6 pt-5 pb-4">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="h-5 w-5 text-primary shrink-0" />
                <DialogTitle className="text-base sm:text-lg truncate">{order.order_number}</DialogTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {order.status && <Badge variant="outline" className="text-xs">{order.status}</Badge>}
                {order.urgency === "Urgent" && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
              </div>
            </div>
            <DialogDescription className="text-sm mt-1">
              {order.patient_name} {order.doctor_name ? `• Dr. ${order.doctor_name}` : ""}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="px-4 sm:px-6 pt-3">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="order" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Order</span> Details
              </TabsTrigger>
              <TabsTrigger value="shipment" className="gap-1.5 text-xs sm:text-sm">
                <Truck className="h-3.5 w-3.5" /> Shipment
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm">
                <MessageSquare className="h-3.5 w-3.5" /> Notes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: Order Details */}
          <TabsContent value="order" className="px-4 sm:px-6 pb-6 mt-4 space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-1">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-primary" /> Treatment Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <DetailRow label="Restoration Type" value={order.restoration_type} />
                <DetailRow label="Teeth Number" value={order.teeth_number} />
                <DetailRow label="Shade" value={order.teeth_shade ? `${order.teeth_shade}${order.shade_system ? ` (${order.shade_system})` : ""}` : null} />
                <DetailRow label="Assigned Lab" value={order.assigned_lab?.name} icon={Package} />
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <CalendarIcon className="h-4 w-4 text-primary" /> Dates
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <DetailRow label="Created" value={order.created_at ? format(new Date(order.created_at), "PPP") : null} icon={CalendarIcon} />
                <DetailRow label="Desired Delivery" value={order.desired_delivery_date ? format(new Date(order.desired_delivery_date), "PPP") : null} icon={CalendarIcon} />
                <DetailRow label="Proposed Delivery" value={order.proposed_delivery_date ? format(new Date(order.proposed_delivery_date), "PPP") : null} icon={CalendarIcon} />
              </div>
            </div>
            {(order.biological_notes || order.handling_instructions || order.approval_notes) && (
              <div className="space-y-3">
                {order.biological_notes && (
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Biological Notes</p>
                    <p className="text-sm">{order.biological_notes}</p>
                  </div>
                )}
                {order.handling_instructions && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Handling Instructions</p>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{order.handling_instructions}</p>
                  </div>
                )}
                {order.approval_notes && (
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Approval Notes</p>
                    <p className="text-sm">{order.approval_notes}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Shipment — display-first with edit toggle */}
          <TabsContent value="shipment" className="px-4 sm:px-6 pb-6 mt-4">
            {canEditShipment && hasShipmentData && !isEditing && (
              <div className="flex justify-end mb-3">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              </div>
            )}
            {isEditing ? <ShipmentEditForm /> : <ShipmentDisplayView />}
          </TabsContent>

          {/* TAB 3: Notes */}
          <TabsContent value="notes" className="px-4 sm:px-6 pb-6 mt-4">
            <OrderNotes orderId={order.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
