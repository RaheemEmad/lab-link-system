import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { OrderNotes } from "@/components/order/OrderNotes";
import { QCChecklist } from "@/components/order/QCChecklist";
import { toast } from "sonner";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { 
  Package,
  Upload,
  FileText,
  Calendar,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  doctor_name: string;
  restoration_type: string;
  status: string;
  urgency: string;
  created_at: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  shipment_tracking: string | null;
  design_file_url: string | null;
  design_approved: boolean | null;
  approval_notes: string | null;
  biological_notes: string | null;
  teeth_number: string;
  teeth_shade: string;
}

const LabWorkflowManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkLabStaffAccess();
    fetchOrders();

    // Realtime subscription
    const channel = supabase
      .channel('lab-workflow-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const checkLabStaffAccess = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!data || (data.role !== 'lab_staff' && data.role !== 'admin')) {
      toast.error("Access Denied", {
        description: "You must be lab staff to access this page."
      });
      navigate("/dashboard");
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get user's lab ID
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('lab_id')
        .eq('user_id', user.id)
        .single();

      if (!userRole?.lab_id) {
        toast.error("Lab not assigned", {
          description: "Your account is not assigned to a lab."
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('assigned_lab_id', userRole.lab_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error("Failed to load orders", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (orderId: string, file: File) => {
    setIsUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('design-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('design-files')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ design_file_url: publicUrl })
        .eq('id', orderId);

      if (updateError) throw updateError;

      toast.success("Design file uploaded successfully!");
      fetchOrders();
      setSelectedOrder(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload design file", {
        description: error.message
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Order status updated!");
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error("Failed to update status", {
        description: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeliveryDateUpdate = async (orderId: string, date: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ expected_delivery_date: date })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Expected delivery date updated!");
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating delivery date:', error);
      toast.error("Failed to update delivery date", {
        description: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShipmentUpdate = async (orderId: string, tracking: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ shipment_tracking: tracking })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Shipment tracking updated!");
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating shipment tracking:', error);
      toast.error("Failed to update shipment tracking", {
        description: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'Pending': return 'secondary';
      case 'In Progress': return 'default';
      case 'Ready for QC': return 'default';
      case 'Ready for Delivery': return 'default';
      case 'Delivered': return 'default';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-secondary/30 py-8">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Lab Workflow Management</h1>
            <p className="text-muted-foreground">
              Manage order status, upload designs, and track shipments
            </p>
          </div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">Active Orders</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {orders.filter(o => o.status !== 'Delivered').length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Active Orders</h3>
                    <p className="text-muted-foreground">
                      All orders are completed or there are no orders assigned to your lab.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                orders.filter(o => o.status !== 'Delivered').map((order) => (
                  <OrderWorkflowCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    onFileUpload={handleFileUpload}
                    onDeliveryDateUpdate={handleDeliveryDateUpdate}
                    onShipmentUpdate={handleShipmentUpdate}
                    isUpdating={isUpdating}
                    isUploadingFile={isUploadingFile}
                    getStatusColor={getStatusColor}
                    formatDate={formatDate}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {orders.filter(o => o.status === 'Delivered').length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Completed Orders</h3>
                    <p className="text-muted-foreground">
                      Completed orders will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                orders.filter(o => o.status === 'Delivered').map((order) => (
                  <OrderWorkflowCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    onFileUpload={handleFileUpload}
                    onDeliveryDateUpdate={handleDeliveryDateUpdate}
                    onShipmentUpdate={handleShipmentUpdate}
                    isUpdating={isUpdating}
                    isUploadingFile={isUploadingFile}
                    getStatusColor={getStatusColor}
                    formatDate={formatDate}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

interface OrderWorkflowCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, status: string) => void;
  onFileUpload: (orderId: string, file: File) => void;
  onDeliveryDateUpdate: (orderId: string, date: string) => void;
  onShipmentUpdate: (orderId: string, tracking: string) => void;
  isUpdating: boolean;
  isUploadingFile: boolean;
  getStatusColor: (status: string) => "default" | "destructive" | "outline" | "secondary";
  formatDate: (date: string | null) => string;
}

const OrderWorkflowCard = ({
  order,
  onStatusUpdate,
  onFileUpload,
  onDeliveryDateUpdate,
  onShipmentUpdate,
  isUpdating,
  isUploadingFile,
  getStatusColor,
  formatDate,
}: OrderWorkflowCardProps) => {
  const [newStatus, setNewStatus] = useState(order.status);
  const [deliveryDate, setDeliveryDate] = useState(order.expected_delivery_date || '');
  const [shipmentTracking, setShipmentTracking] = useState(order.shipment_tracking || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [qcComplete, setQcComplete] = useState(false);
  const [showQcWarning, setShowQcWarning] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileSubmit = () => {
    if (selectedFile) {
      onFileUpload(order.id, selectedFile);
      setSelectedFile(null);
      setShowFileDialog(false);
    }
  };

  const handleStatusChange = (value: string) => {
    // Check if trying to move to "Ready for Delivery" without QC completion
    if (value === 'Ready for Delivery' && order.status === 'Ready for QC' && !qcComplete) {
      setShowQcWarning(true);
      return;
    }
    setNewStatus(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Order {order.order_number}
              {order.urgency === 'Urgent' && (
                <Badge variant="destructive">Urgent</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {order.patient_name} • Dr. {order.doctor_name} • {order.restoration_type}
            </CardDescription>
          </div>
          <Badge variant={getStatusColor(order.status)}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Details */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground">Teeth Number</Label>
            <p className="text-sm font-medium">{order.teeth_number}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Shade</Label>
            <p className="text-sm font-medium">{order.teeth_shade}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Order Date</Label>
            <p className="text-sm font-medium">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Design Status</Label>
            <div className="flex items-center gap-1">
              {order.design_approved === true && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">Approved</span>
                </>
              )}
              {order.design_approved === false && (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Revision Needed</span>
                </>
              )}
              {order.design_approved === null && (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Pending Review</span>
                </>
              )}
            </div>
          </div>
        </div>

        {order.biological_notes && (
          <div>
            <Label className="text-xs text-muted-foreground">Clinical Notes</Label>
            <p className="text-sm mt-1 p-3 bg-muted rounded-md">{order.biological_notes}</p>
          </div>
        )}

        {order.approval_notes && (
          <div>
            <Label className="text-xs text-muted-foreground">Dentist Feedback</Label>
            <p className="text-sm mt-1 p-3 bg-muted rounded-md">{order.approval_notes}</p>
          </div>
        )}

        {/* Workflow Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Status Update */}
          <div className="space-y-2">
            <Label>Order Status</Label>
            <Select value={newStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Ready for QC">Ready for QC</SelectItem>
                <SelectItem value="Ready for Delivery">Ready for Delivery</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            {showQcWarning && (
              <p className="text-xs text-destructive">
                Complete all QC checklist items before marking as Ready for Delivery
              </p>
            )}
            {newStatus !== order.status && (
              <Button
                size="sm"
                onClick={() => onStatusUpdate(order.id, newStatus)}
                disabled={isUpdating}
                className="w-full"
              >
                Update Status
              </Button>
            )}
          </div>

          {/* Expected Delivery Date */}
          <div className="space-y-2">
            <Label>Expected Delivery Date</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            {deliveryDate !== order.expected_delivery_date && (
              <Button
                size="sm"
                onClick={() => onDeliveryDateUpdate(order.id, deliveryDate)}
                disabled={isUpdating}
                className="w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Update Date
              </Button>
            )}
          </div>
        </div>

        {/* Design File Upload */}
        <div className="space-y-2">
          <Label>Design File</Label>
          {order.design_file_url ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={order.design_file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  View Current Design
                </a>
              </Button>
              <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Version
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Design File</DialogTitle>
                    <DialogDescription>
                      Upload a new design file for dentist review and approval
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.stl"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleFileSubmit}
                      disabled={!selectedFile || isUploadingFile}
                    >
                      {isUploadingFile ? "Uploading..." : "Upload"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Design File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Design File</DialogTitle>
                  <DialogDescription>
                    Upload a design file for dentist review and approval
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.stl"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleFileSubmit}
                    disabled={!selectedFile || isUploadingFile}
                  >
                    {isUploadingFile ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Shipment Tracking */}
        <div className="space-y-2">
          <Label>Shipment Tracking URL</Label>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://tracking.example.com/..."
              value={shipmentTracking}
              onChange={(e) => setShipmentTracking(e.target.value)}
            />
            {shipmentTracking !== order.shipment_tracking && (
              <Button
                size="sm"
                onClick={() => onShipmentUpdate(order.id, shipmentTracking)}
                disabled={isUpdating}
              >
                <Truck className="h-4 w-4 mr-2" />
                Update
              </Button>
            )}
          </div>
        </div>

        {/* QC Checklist - Show when order is Ready for QC or later */}
        {(order.status === 'Ready for QC' || order.status === 'Ready for Delivery' || order.status === 'Delivered') && (
          <div className="mt-4 pt-4 border-t">
            <QCChecklist 
              orderId={order.id} 
              orderStatus={order.status}
              onStatusUpdateAllowed={(allowed) => {
                setQcComplete(allowed);
                if (!allowed && newStatus === 'Ready for Delivery') {
                  setShowQcWarning(true);
                }
              }}
            />
          </div>
        )}

        {/* Internal Notes */}
        <div className="mt-4 pt-4 border-t">
          <OrderNotes orderId={order.id} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LabWorkflowManagement;