import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  Printer, 
  FileText,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle2,
  MessageSquare,
  Edit3
} from "lucide-react";
import { format } from "date-fns";

interface OrderReceiptPDFProps {
  orderId: string;
  onClose?: () => void;
}

export const OrderReceiptPDF = ({ orderId, onClose }: OrderReceiptPDFProps) => {
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch comprehensive order data
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-receipt", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_lab:labs(id, name, contact_email, contact_phone, address)
        `)
        .eq("id", orderId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch order notes
  const { data: notes } = useQuery({
    queryKey: ["order-notes-receipt", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_notes")
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch chat messages
  const { data: messages } = useQuery({
    queryKey: ["order-messages-receipt", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch edit history
  const { data: editHistory } = useQuery({
    queryKey: ["order-edit-history-receipt", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_edit_history")
        .select(`
          *,
          changed_by_user:profiles!fk_changed_by(full_name)
        `)
        .eq("order_id", orderId)
        .order("changed_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch status history
  const { data: statusHistory } = useQuery({
    queryKey: ["order-status-history-receipt", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select(`
          *,
          changed_by_user:profiles!fk_changed_by_profile(full_name)
        `)
        .eq("order_id", orderId)
        .order("changed_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch invoice if exists
  const { data: invoice } = useQuery({
    queryKey: ["order-invoice-receipt", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("order_id", orderId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const formatEGP = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-EG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  if (orderLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Order not found</p>
        </CardContent>
      </Card>
    );
  }

  const assignedLab = order.assigned_lab as any;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Print Controls - Hidden when printing */}
      <div className="flex justify-end gap-2 mb-4 print:hidden">
        <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
          <Printer className="h-4 w-4 mr-2" />
          {isPrinting ? "Preparing..." : "Print / Save PDF"}
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Receipt Content */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-6 sm:p-8 print:p-4">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-2xl font-bold text-primary mb-1">LABLINK</h1>
            <p className="text-sm text-muted-foreground">Dental Laboratory Management Platform</p>
            <div className="mt-4">
              <h2 className="text-xl font-semibold">ORDER RECEIPT</h2>
              <p className="text-sm text-muted-foreground mt-1">Electronic Invoice</p>
            </div>
          </div>

          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-muted-foreground">Receipt #</p>
              <p className="font-medium">REC-{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Order Date</p>
              <p className="font-medium">{format(new Date(order.created_at), 'PPP')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Order #</p>
              <p className="font-medium">{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Status</p>
              <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'}>
                {order.status}
              </Badge>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Patient & Doctor Info */}
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Patient Information</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> {order.patient_name}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Doctor Information</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> Dr. {order.doctor_name}</p>
              </div>
            </div>
          </div>

          {/* Lab Info */}
          {assignedLab && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Laboratory</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium">{assignedLab.name}</p>
                {assignedLab.contact_email && <p>{assignedLab.contact_email}</p>}
                {assignedLab.contact_phone && <p>{assignedLab.contact_phone}</p>}
                {assignedLab.address && <p className="text-muted-foreground">{assignedLab.address}</p>}
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Order Details */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Order Details</h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Restoration Type</p>
                  <p className="font-medium">{order.restoration_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Urgency</p>
                  <Badge variant={order.urgency === 'Urgent' ? 'destructive' : 'secondary'}>
                    {order.urgency}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Teeth</p>
                  <p className="font-medium">{order.teeth_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shade</p>
                  <p className="font-medium">{order.teeth_shade} ({order.shade_system || 'VITA Classical'})</p>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor's Notes */}
          {(order.biological_notes || order.handling_instructions || order.approval_notes) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Doctor's Notes</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
                {order.biological_notes && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase mb-1">Biological/Clinical Notes</p>
                    <p>{order.biological_notes}</p>
                  </div>
                )}
                {order.handling_instructions && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase mb-1">Handling Instructions</p>
                    <p>{order.handling_instructions}</p>
                  </div>
                )}
                {order.approval_notes && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase mb-1">Approval Notes</p>
                    <p>{order.approval_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {notes && notes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Order Notes</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                {notes.map((note: any) => (
                  <div key={note.id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <p className="text-xs text-muted-foreground">
                      {note.user?.full_name || 'Unknown'} • {format(new Date(note.created_at), 'PPp')}
                    </p>
                    <p>{note.note_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communication Log */}
          {messages && messages.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Communication Log</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 max-h-60 overflow-y-auto print:max-h-none">
                {messages.slice(0, 20).map((msg: any) => (
                  <div key={msg.id} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <p className="text-xs text-muted-foreground">
                      [{format(new Date(msg.created_at), 'MMM d, h:mm a')}] {msg.sender_role}
                    </p>
                    <p className="line-clamp-2">{msg.message_text}</p>
                  </div>
                ))}
                {messages.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{messages.length - 20} more messages
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Changes & Updates */}
          {editHistory && editHistory.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Edit3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Changes & Updates</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                {editHistory.map((edit: any) => (
                  <div key={edit.id} className="text-xs">
                    <span className="text-muted-foreground">
                      [{format(new Date(edit.changed_at), 'MMM d, h:mm a')}]
                    </span>
                    {' '}{edit.change_summary || 'Update made'}
                    {' '}by {edit.changed_by_user?.full_name || 'Unknown'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Timeline */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Timeline</h3>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-muted-foreground text-xs">Order Created</p>
                    <p className="font-medium">{format(new Date(order.created_at), 'PPp')}</p>
                  </div>
                </div>
                {order.expected_delivery_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-muted-foreground text-xs">Expected Delivery</p>
                      <p className="font-medium">{format(new Date(order.expected_delivery_date), 'PPP')}</p>
                    </div>
                  </div>
                )}
                {order.actual_delivery_date && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-muted-foreground text-xs">Delivered</p>
                      <p className="font-medium">{format(new Date(order.actual_delivery_date), 'PPp')}</p>
                    </div>
                  </div>
                )}
                {order.delivery_confirmed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-muted-foreground text-xs">Confirmed</p>
                      <p className="font-medium">{format(new Date(order.delivery_confirmed_at), 'PPp')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Financial Summary */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Financial Summary</h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                {order.agreed_fee && (
                  <div className="flex justify-between">
                    <span>Agreed Fee</span>
                    <span className="font-medium">{formatEGP(order.agreed_fee)}</span>
                  </div>
                )}
                {invoice && (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatEGP(invoice.subtotal || 0)}</span>
                    </div>
                    {invoice.adjustments_total !== 0 && (
                      <div className="flex justify-between">
                        <span>Adjustments</span>
                        <span>{formatEGP(invoice.adjustments_total || 0)}</span>
                      </div>
                    )}
                    {invoice.expenses_total !== 0 && (
                      <div className="flex justify-between">
                        <span>Expenses</span>
                        <span>{formatEGP(invoice.expenses_total || 0)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between text-base font-bold">
                      <span>TOTAL</span>
                      <span>{formatEGP(invoice.final_total || 0)}</span>
                    </div>
                  </>
                )}
                {!invoice && order.agreed_fee && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-base font-bold">
                      <span>TOTAL</span>
                      <span>{formatEGP(order.agreed_fee)}</span>
                    </div>
                  </>
                )}
                {!invoice && !order.agreed_fee && order.target_budget && (
                  <div className="flex justify-between">
                    <span>Target Budget</span>
                    <span className="font-medium">{formatEGP(order.target_budget)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground border-t pt-6">
            <p>Generated: {format(new Date(), 'PPPp')}</p>
            <p className="mt-1">This is an official electronic receipt from LabLink.</p>
            <p className="mt-1">For questions, contact support@lablink.com</p>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl, .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
