import { useState } from "react";
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
import { CalendarIcon, Package, Phone, Truck, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderNotes } from "@/components/order/OrderNotes";

const shipmentSchema = z.object({
  proposedDeliveryDate: z.date().optional(),
  deliveryDateComment: z.string().optional(),
  carrierName: z.string().min(1, "Carrier name is required"),
  carrierPhone: z.string().min(1, "Carrier phone is required"),
  shipmentTracking: z.string().optional(),
});

type ShipmentFormValues = z.infer<typeof shipmentSchema>;

interface ShipmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    patient_name: string;
    desired_delivery_date?: string | null;
    proposed_delivery_date?: string | null;
    delivery_date_comment?: string | null;
    carrier_name?: string | null;
    carrier_phone?: string | null;
    shipment_tracking?: string | null;
  };
  onUpdate?: () => void;
  userRole?: string;
}

export function ShipmentDetailsDialog({
  open,
  onOpenChange,
  order,
  onUpdate,
  userRole
}: ShipmentDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const isLabStaff = userRole === "lab_staff";
  const canEdit = isLabStaff;

  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      proposedDeliveryDate: order.proposed_delivery_date ? new Date(order.proposed_delivery_date) : undefined,
      deliveryDateComment: order.delivery_date_comment || "",
      carrierName: order.carrier_name || "",
      carrierPhone: order.carrier_phone || "",
      shipmentTracking: order.shipment_tracking || "",
    },
  });

  const onSubmit = async (values: ShipmentFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update shipment details
      const { error } = await supabase
        .from('orders')
        .update({
          proposed_delivery_date: values.proposedDeliveryDate?.toISOString().split('T')[0],
          delivery_date_comment: values.deliveryDateComment,
          carrier_name: values.carrierName,
          carrier_phone: values.carrierPhone,
          shipment_tracking: values.shipmentTracking,
        })
        .eq('id', order.id);

      if (error) throw error;

      // Create a note about the shipment update
      const noteText = `Shipment details updated:\n` +
        `📦 Carrier: ${values.carrierName}\n` +
        `📞 Carrier Phone: ${values.carrierPhone}\n` +
        (values.proposedDeliveryDate ? `📅 Proposed Delivery: ${format(values.proposedDeliveryDate, 'PPP')}\n` : '') +
        (values.deliveryDateComment ? `💬 Comment: ${values.deliveryDateComment}\n` : '') +
        (values.shipmentTracking ? `🔍 Tracking: ${values.shipmentTracking}` : '');

      const { error: noteError } = await supabase
        .from('order_notes')
        .insert({
          order_id: order.id,
          user_id: user.id,
          note_text: noteText,
        });

      if (noteError) {
        console.error('Error creating note:', noteError);
      }

      // Send notification to the doctor
      const { data: orderData } = await supabase
        .from('orders')
        .select('doctor_id')
        .eq('id', order.id)
        .single();

      if (orderData?.doctor_id) {
        const notificationMessage = `Shipment details have been updated for order ${order.order_number}. Carrier: ${values.carrierName}${values.proposedDeliveryDate ? `, Delivery: ${format(values.proposedDeliveryDate, 'PPP')}` : ''}`;
        
        // Call the send-push-notification edge function
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              orderId: order.id,
              type: 'shipment_update',
              message: notificationMessage,
            },
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }

      toast.success("Shipment details updated successfully");
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error("Failed to update shipment details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipment Details - {order.order_number}
          </DialogTitle>
          <DialogDescription>
            {canEdit 
              ? `Manage delivery dates, carrier information, and tracking for ${order.patient_name}`
              : `View shipment details and communicate about ${order.patient_name}'s order`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={canEdit ? "details" : "notes"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Shipment Details</TabsTrigger>
            <TabsTrigger value="notes">Notes & Communication</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Desired Delivery Date (Doctor's Request) */}
                {order.desired_delivery_date && (
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Doctor's Desired Date</span>
                    </div>
                    <p className="text-sm">{format(new Date(order.desired_delivery_date), 'PPP')}</p>
                  </div>
                )}

                {/* Proposed Delivery Date */}
                <FormField
                  control={form.control}
                  name="proposedDeliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Proposed Delivery Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              disabled={!canEdit}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Delivery Date Comment */}
                <FormField
                  control={form.control}
                  name="deliveryDateComment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Different Date (if applicable)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explain why the proposed date differs from the desired date..."
                          className="resize-none"
                          disabled={!canEdit}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Carrier Name */}
                <FormField
                  control={form.control}
                  name="carrierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Carrier Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., FedEx, UPS, DHL" disabled={!canEdit} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Carrier Phone */}
                <FormField
                  control={form.control}
                  name="carrierPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Carrier Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="For escalation contact" disabled={!canEdit} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tracking Number */}
                <FormField
                  control={form.control}
                  name="shipmentTracking"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Tracking Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Shipment tracking number" disabled={!canEdit} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Information */}
                <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-2">
                    📞 For Escalation
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact the lab directly for urgent matters or tracking issues.
                  </p>
                </div>

                {canEdit && (
                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save Shipment Details"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <OrderNotes orderId={order.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
