import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Building2, User, Palette, Hash, FileText, Clock } from "lucide-react";
import { format } from "date-fns";

interface FeedbackRoomHeaderProps {
  order: any;
}

const statusColors: Record<string, string> = {
  "Pending": "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  "Ready for QC": "bg-accent/10 text-accent border-accent/20",
  "Ready for Delivery": "bg-primary/10 text-primary border-primary/20",
  "Delivered": "bg-success/10 text-success border-success/20",
};

const FeedbackRoomHeader = ({ order }: FeedbackRoomHeaderProps) => {
  return (
    <Card className="bg-muted/50">
      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Order Number & Status */}
          <div className="flex items-center gap-3">
            <div>
              <div className="font-mono font-bold text-lg">{order.order_number}</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), "MMM dd, yyyy")}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>
                {order.urgency}
              </Badge>
              <Badge variant="outline" className={statusColors[order.status]}>
                {order.status}
              </Badge>
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{order.patient_name}</span>
          </div>

          {/* Restoration Details */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{order.restoration_type}</span>
            </div>
            <div className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              <span>{order.teeth_shade}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              <span>{order.teeth_number}</span>
            </div>
          </div>

          {/* Lab Info */}
          {order.labs && (
            <div className="flex items-center gap-2 ml-auto">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <div className="font-medium">{order.labs.name}</div>
                <div className="text-xs text-muted-foreground">{order.labs.contact_email}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default FeedbackRoomHeader;
