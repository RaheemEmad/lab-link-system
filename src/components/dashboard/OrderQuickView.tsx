import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderProgressStrip } from "./OrderProgressStrip";
import { Building2, MessageCircle, Pencil, FileText, User, Palette, Hash, Calendar, Clock, StickyNote, MessageSquareMore, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";

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
  onViewHistory: (order: Order) => void;
  onViewNotes: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  isDoctor: boolean;
}

const actionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.2, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export const OrderQuickView = ({
  order,
  open,
  onClose,
  onOpenChat,
  onViewHistory,
  onViewNotes,
  onDeleteOrder,
  isDoctor,
}: OrderQuickViewProps) => {
  const navigate = useNavigate();

  const handleAction = useCallback(
    (callback: () => void) => {
      onClose();
      setTimeout(callback, 200);
    },
    [onClose]
  );

  if (!order) return null;

  const actions = [
    ...(order.assigned_lab_id
      ? [
          {
            label: "Open Chat",
            icon: MessageCircle,
            variant: "outline" as const,
            onClick: () => handleAction(() => onOpenChat(order)),
          },
        ]
      : []),
    {
      label: "View Notes",
      icon: StickyNote,
      variant: "outline" as const,
      onClick: () => handleAction(() => onViewNotes(order)),
    },
    {
      label: "View History",
      icon: Clock,
      variant: "outline" as const,
      onClick: () => handleAction(() => onViewHistory(order)),
    },
    {
      label: "Feedback Room",
      icon: MessageSquareMore,
      variant: "outline" as const,
      onClick: () => handleAction(() => navigate(`/feedback-room?orderId=${order.id}`)),
    },
    {
      label: "Edit Order",
      icon: Pencil,
      variant: "outline" as const,
      onClick: () => handleAction(() => navigate(`/edit-order/${order.id}`)),
    },
    ...(isDoctor
      ? [
          {
            label: "Delete Order",
            icon: Trash2,
            variant: "destructive" as const,
            onClick: () => handleAction(() => onDeleteOrder(order.id)),
          },
        ]
      : []),
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono">{order.order_number}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 animate-fade-in">
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
            <h4 className="text-sm font-semibold text-foreground">Patient Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{order.patient_name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{order.restoration_type}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Palette className="h-4 w-4 shrink-0" />
                <span className="truncate">{order.teeth_shade}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4 shrink-0" />
                <span className="truncate">{order.teeth_number}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Timeline</h4>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              Created: {format(new Date(order.timestamp), "MMM d, yyyy")}
            </div>
            {order.expected_delivery_date && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                Deadline: {format(new Date(order.expected_delivery_date), "MMM d, yyyy")}
              </div>
            )}
          </div>

          <Separator />

          {/* Lab Info */}
          {order.labs && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Assigned Lab</h4>
                <button
                  onClick={() => handleAction(() => navigate(`/labs/${order.labs!.id}`))}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors min-h-[44px]"
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{order.labs.name}</span>
                </button>
              </div>
              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {actions.map((action, i) => (
                <motion.div
                  key={action.label}
                  custom={i}
                  variants={actionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Button
                    variant={action.variant}
                    className="w-full min-h-[44px] active:scale-[0.98] transition-transform justify-start"
                    onClick={action.onClick}
                  >
                    <action.icon className="h-4 w-4 mr-2 shrink-0" />
                    {action.label}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
