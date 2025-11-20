import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { CheckCircle2, XCircle, FileText, Download, MessageSquare } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  restoration_type: string;
  status: string;
  design_file_url: string | null;
  design_approved: boolean | null;
  approval_notes: string | null;
}

const DesignApprovalWorkflow = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    fetchOrdersForApproval();

    // Realtime subscription
    const channel = supabase
      .channel('design-approval-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `doctor_id=eq.${user.id}`
        },
        () => {
          fetchOrdersForApproval();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchOrdersForApproval = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('doctor_id', user.id)
        .not('design_file_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to load designs", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (orderId: string, approved: boolean) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          design_approved: approved,
          approval_notes: approvalNotes || null
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(approved ? "Design Approved!" : "Revision Requested", {
        description: approved 
          ? "The order will automatically progress to the next stage."
          : "The lab has been notified of your feedback."
      });

      setSelectedOrder(null);
      setApprovalNotes("");
      fetchOrdersForApproval();
    } catch (error: any) {
      console.error('Error updating approval:', error);
      toast.error("Failed to update approval", {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="container max-w-4xl mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Design Approval</h1>
        <p className="text-muted-foreground">
          Review and approve design files from your lab
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Designs to Review</h3>
            <p className="text-muted-foreground">
              Design files awaiting your approval will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Order {order.order_number}</CardTitle>
                    <CardDescription>
                      {order.patient_name} • {order.restoration_type}
                    </CardDescription>
                  </div>
                  {order.design_approved === true && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {order.design_approved === false && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Revision Requested
                    </Badge>
                  )}
                  {order.design_approved === null && (
                    <Badge variant="secondary">
                      Pending Review
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Design File */}
                <div>
                  <Label className="text-sm font-medium">Design File</Label>
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    asChild
                  >
                    <a
                      href={order.design_file_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      View Design File
                    </a>
                  </Button>
                </div>

                {/* Previous Approval Notes */}
                {order.approval_notes && (
                  <div>
                    <Label className="text-sm font-medium">Your Previous Feedback</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm">{order.approval_notes}</p>
                    </div>
                  </div>
                )}

                {/* Approval Actions */}
                <Dialog 
                  open={selectedOrder?.id === order.id} 
                  onOpenChange={(open) => {
                    if (!open) {
                      setSelectedOrder(null);
                      setApprovalNotes("");
                    }
                  }}
                >
                  <div className="flex gap-2">
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => setSelectedOrder(order)}
                        disabled={order.design_approved === true}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve Design
                      </Button>
                    </DialogTrigger>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Request Revision
                      </Button>
                    </DialogTrigger>
                  </div>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {order.design_approved === true 
                          ? "Update Approval" 
                          : "Provide Feedback"}
                      </DialogTitle>
                      <DialogDescription>
                        Add notes or feedback for the lab team (optional)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Approval Notes</Label>
                        <Textarea
                          placeholder="Enter any feedback, notes, or revision requests..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleApproval(order.id, false)}
                        disabled={isSubmitting}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Request Revision
                      </Button>
                      <Button
                        onClick={() => handleApproval(order.id, true)}
                        disabled={isSubmitting}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve Design
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DesignApprovalWorkflow;