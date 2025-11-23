import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge, WorkflowStatusBadge, UrgencyBadge } from "@/components/ui/order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function StatusBadgeShowcase() {
  return (
    <div className="space-y-8">
      {/* Order Status Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Badges</CardTitle>
          <CardDescription>Status indicators for order tracking with blue and green color system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Normal Orders</h3>
            <div className="flex flex-wrap gap-3">
              <OrderStatusBadge status="Pending" />
              <OrderStatusBadge status="In Progress" />
              <OrderStatusBadge status="Ready for QC" />
              <OrderStatusBadge status="Ready for Delivery" />
              <OrderStatusBadge status="Delivered" />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Urgent Orders</h3>
            <div className="flex flex-wrap gap-3">
              <OrderStatusBadge status="Pending" urgency="Urgent" />
              <OrderStatusBadge status="In Progress" urgency="Urgent" />
              <OrderStatusBadge status="Ready for QC" urgency="Urgent" />
              <OrderStatusBadge status="Ready for Delivery" urgency="Urgent" />
              <OrderStatusBadge status="Delivered" urgency="Urgent" />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Without Icons</h3>
            <div className="flex flex-wrap gap-3">
              <OrderStatusBadge status="Pending" showIcon={false} />
              <OrderStatusBadge status="In Progress" showIcon={false} />
              <OrderStatusBadge status="Ready for QC" showIcon={false} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgency Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Urgency Badges</CardTitle>
          <CardDescription>Priority level indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <UrgencyBadge urgency="Normal" />
            <UrgencyBadge urgency="Urgent" />
          </div>
        </CardContent>
      </Card>

      {/* Workflow Status Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Status Badges</CardTitle>
          <CardDescription>General workflow state indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <WorkflowStatusBadge active={true} />
            <WorkflowStatusBadge active={false} />
            <WorkflowStatusBadge active={true} label="Processing" />
            <WorkflowStatusBadge active={false} label="Paused" />
            <WorkflowStatusBadge active={true} label="Live" showIcon={false} />
          </div>
        </CardContent>
      </Card>

      {/* Core Badge Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Core Badge Variants</CardTitle>
          <CardDescription>Basic badge styles from design system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Custom Color Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Color Badges</CardTitle>
          <CardDescription>Direct color variant badges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Blue Spectrum</h3>
            <div className="flex flex-wrap gap-3">
              <Badge variant="pending">Light Blue</Badge>
              <Badge variant="normal">Sky Blue</Badge>
              <Badge variant="in-progress">Ocean Blue</Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Green Spectrum</h3>
            <div className="flex flex-wrap gap-3">
              <Badge variant="active">Mint Green</Badge>
              <Badge variant="ready-qc">Dark Teal</Badge>
              <Badge variant="delivered">Forest Green</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
