import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderProgressStrip } from "./OrderProgressStrip";
import { Building2, MessageCircle, Pencil, FileText, User, Palette, Hash, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  doctor_name: string;
  patient_name: string;
  restoration_type: string;
  teeth_shade: string;
  teeth_number: string;
  urgency: string;
  status: string;
  timestamp: string;
  expected_delivery_date?: string | null;
  assigned_lab_id: string | null;
  labs: { id: string; name: string; contact_email: string; contact_phone: string | null; description: string | null } | null;
}

interface OrderQuickViewProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onOpenChat: (order: Order) => void;
  isDoctor: boolean;
}

export const OrderQuickView = ({ order, open, onClose, onOpenChat, isDoctor }: OrderQuickViewProps) => {
  const navigate = useNavigate();
  if (!order) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono">{order.order_number}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 fade-in-up">
          {/* Status & Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>{order.urgency}</Badge>
              <Badge variant="outline">{order.status}</Badge>
            </div>
            {isDoctor && <OrderProgressStrip status={order.status} />}
          </div>

          <Separator />

          {/* Patient Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Patient Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{order.patient_name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{order.restoration_type}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Palette className="h-4 w-4" />
                <span>{order.teeth_shade}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>{order.teeth_number}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Timeline</h4>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created: {format(new Date(order.timestamp), "MMM d, yyyy")}
            </div>
            {order.expected_delivery_date && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Deadline: {format(new Date(order.expected_delivery_date), "MMM d, yyyy")}
              </div>
            )}
          </div>

          <Separator />

          {/* Lab Info */}
          {order.labs && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Assigned Lab</h4>
                <button
                  onClick={() => navigate(`/labs/${order.labs!.id}`)}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  <span>{order.labs.name}</span>
                </button>
              </div>
              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {order.assigned_lab_id && (
              <Button variant="outline" onClick={() => { onClose(); setTimeout(() => onOpenChat(order), 300); }}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Open Chat
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/edit-order/${order.id}`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Order
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
