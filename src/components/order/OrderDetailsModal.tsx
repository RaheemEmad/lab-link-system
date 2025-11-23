import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, User, FileText, Palette, Activity } from "lucide-react";
import { format } from "date-fns";

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    patient_name: string;
    status: string;
    urgency: string;
    created_at: string;
    restoration_type: string;
    teeth_number: string;
    teeth_shade: string;
    biological_notes: string | null;
    desired_delivery_date: string | null;
    assigned_lab: { name: string } | null;
  };
}

export function OrderDetailsModal({ open, onOpenChange, order }: OrderDetailsModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
              Shade & Notes
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Teeth Shade:</span>
                <p className="font-medium">{order.teeth_shade}</p>
              </div>
              {order.biological_notes && (
                <div>
                  <span className="text-muted-foreground">Biological Notes:</span>
                  <p className="font-medium bg-muted p-3 rounded-lg mt-1">
                    {order.biological_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
