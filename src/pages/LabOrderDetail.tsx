import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, Upload, Send, AlertCircle, Clock, Truck, Package } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { OrderStatusDialog } from "@/components/order/OrderStatusDialog";
import OrderNotesDialog from "@/components/order/OrderNotesDialog";
import { QCChecklist } from "@/components/order/QCChecklist";
import { OrderHistoryTimeline } from "@/components/order/OrderHistoryTimeline";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  doctor_name: string;
  doctor_id: string;
  restoration_type: string;
  teeth_number: string;
  teeth_shade: string;
  shade_system: string | null;
  biological_notes: string | null;
  status: string;
  urgency: string;
  created_at: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  shipment_tracking: string | null;
  design_file_url: string | null;
  design_approved: boolean | null;
  approval_notes: string | null;
  html_export: string | null;
  screenshot_url: string | null;
  assigned_lab_id: string | null;
  driver_name: string | null;
  driver_phone_whatsapp: string | null;
  pickup_time: string | null;
  tracking_location: string | null;
  shipment_notes: string | null;
  carrier_name: string | null;
  carrier_phone: string | null;
}

interface LabEditableFields {
  restoration_type: string;
  teeth_shade: string;
  biological_notes: string;
  expected_delivery_date: string;
  shipment_tracking: string;
}

interface ShipmentDetails {
  driver_name: string;
  driver_phone_whatsapp: string;
  pickup_time: string;
  tracking_location: string;
  shipment_notes: string;
  carrier_name: string;
  carrier_phone: string;
}

const LabOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSavingShipment, setIsSavingShipment] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  
  // Lab-editable fields
  const [editableFields, setEditableFields] = useState<LabEditableFields>({
    restoration_type: "",
    teeth_shade: "",
    biological_notes: "",
    expected_delivery_date: "",
    shipment_tracking: "",
  });

  // Shipment details
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails>({
    driver_name: "",
    driver_phone_whatsapp: "",
    pickup_time: "",
    tracking_location: "",
    shipment_notes: "",
    carrier_name: "",
    carrier_phone: "",
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkLabAccess();
    fetchOrder();

    // Real-time subscription for order updates
    const orderChannel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [user, orderId]);

  const checkLabAccess = async () => {
    if (!user) return;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, lab_id')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'lab_staff' && roleData.role !== 'admin')) {
      toast.error("Access Denied", {
        description: "You must be lab staff to access this page."
      });
      navigate("/dashboard");
    }
  };

  const fetchOrder = async () => {
    if (!orderId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Order not found");
        navigate("/lab-workflow");
        return;
      }

      // Verify this order is assigned to the lab
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('lab_id')
        .eq('user_id', user!.id)
        .single();

      if (userRole?.lab_id !== data.assigned_lab_id) {
        toast.error("Access Denied", {
          description: "This order is not assigned to your lab."
        });
        navigate("/lab-workflow");
        return;
      }

      setOrder(data);
      setEditableFields({
        restoration_type: data.restoration_type,
        teeth_shade: data.teeth_shade,
        biological_notes: data.biological_notes || "",
        expected_delivery_date: data.expected_delivery_date || "",
        shipment_tracking: data.shipment_tracking || "",
      });
      setShipmentDetails({
        driver_name: data.driver_name || "",
        driver_phone_whatsapp: data.driver_phone_whatsapp || "",
        pickup_time: data.pickup_time ? new Date(data.pickup_time).toISOString().slice(0, 16) : "",
        tracking_location: data.tracking_location || "",
        shipment_notes: data.shipment_notes || "",
        carrier_name: data.carrier_name || "",
        carrier_phone: data.carrier_phone || "",
      });
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error("Failed to load order", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!order) return;

    setIsSaving(true);
    try {
      // Track what changed
      const changes: Record<string, { old: any; new: any }> = {};
      
      if (editableFields.restoration_type !== order.restoration_type) {
        changes["Restoration Type"] = { old: order.restoration_type, new: editableFields.restoration_type };
      }
      if (editableFields.teeth_shade !== order.teeth_shade) {
        changes["Teeth Shade"] = { old: order.teeth_shade, new: editableFields.teeth_shade };
      }
      if (editableFields.biological_notes !== (order.biological_notes || "")) {
        changes["Clinical Notes"] = { old: order.biological_notes || "", new: editableFields.biological_notes };
      }
      if (editableFields.expected_delivery_date !== (order.expected_delivery_date || "")) {
        changes["Expected Delivery"] = { old: order.expected_delivery_date || "", new: editableFields.expected_delivery_date };
      }
      if (editableFields.shipment_tracking !== (order.shipment_tracking || "")) {
        changes["Shipment Tracking"] = { old: order.shipment_tracking || "", new: editableFields.shipment_tracking };
      }

      if (Object.keys(changes).length === 0) {
        toast.info("No changes to save");
        return;
      }

      // Update order
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          restoration_type: editableFields.restoration_type as any,
          teeth_shade: editableFields.teeth_shade,
          biological_notes: editableFields.biological_notes || null,
          expected_delivery_date: editableFields.expected_delivery_date || null,
          shipment_tracking: editableFields.shipment_tracking || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Log to audit trail
      const { error: historyError } = await supabase
        .from('order_edit_history')
        .insert({
          order_id: order.id,
          changed_by: user!.id,
          changed_fields: changes,
          change_summary: `Lab updated: ${Object.keys(changes).join(", ")}`,
        });

      if (historyError) {
        console.error('Failed to log edit history:', historyError);
      }

      toast.success("Changes saved successfully!");
      fetchOrder();
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast.error("Failed to save changes", {
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !order) return;

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB"
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.stl', '.dcm', '.zip'];
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      toast.error("Invalid file type", {
        description: `Allowed types: ${allowedTypes.join(', ')}`
      });
      return;
    }

    setIsUploadingFile(true);
    try {
      const fileName = `${order.id}/${Date.now()}_${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('design-files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('design-files')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ design_file_url: publicUrl })
        .eq('id', order.id);

      if (updateError) throw updateError;

      toast.success("Design file uploaded successfully!");
      setSelectedFile(null);
      fetchOrder();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload file", {
        description: error.message
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !order) return;

    try {
      const { error } = await supabase
        .from('order_notes')
        .insert({
          order_id: order.id,
          user_id: user!.id,
          note_text: newComment.trim(),
        });

      if (error) throw error;

      toast.success("Comment added");
      setNewComment("");
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error("Failed to add comment", {
        description: error.message
      });
    }
  };

  const handleSaveShipment = async () => {
    if (!order) return;

    setIsSavingShipment(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          driver_name: shipmentDetails.driver_name || null,
          driver_phone_whatsapp: shipmentDetails.driver_phone_whatsapp || null,
          pickup_time: shipmentDetails.pickup_time ? new Date(shipmentDetails.pickup_time).toISOString() : null,
          tracking_location: shipmentDetails.tracking_location || null,
          shipment_notes: shipmentDetails.shipment_notes || null,
          carrier_name: shipmentDetails.carrier_name || null,
          carrier_phone: shipmentDetails.carrier_phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      // Create notification for doctor
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: order.doctor_id,
          order_id: order.id,
          type: 'shipment_update',
          title: 'Shipment Details Updated',
          message: `Shipment details have been added for order #${order.order_number}. Driver: ${shipmentDetails.driver_name || 'N/A'}`,
        });

      if (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      toast.success("Shipment details saved successfully!");
      fetchOrder();
    } catch (error: any) {
      console.error('Error saving shipment:', error);
      toast.error("Failed to save shipment details", {
        description: error.message
      });
    } finally {
      setIsSavingShipment(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-8">
          <div className="container max-w-6xl mx-auto px-4">
            <Skeleton className="h-10 w-64 mb-6" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
              <div className="space-y-6">
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-secondary/30 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/lab-workflow")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflow
          </Button>

          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h1 className="text-3xl font-bold">Order {order.order_number}</h1>
                <p className="text-muted-foreground">
                  {order.patient_name} • Dr. {order.doctor_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {order.urgency === 'Urgent' && (
                  <Badge variant="destructive">Urgent</Badge>
                )}
                <Badge>{order.status}</Badge>
              </div>
            </div>
          </div>

          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Lab Access:</strong> You can edit materials, shade, clinical notes, timeline, and shipping details. 
              Patient information and order type are managed by the doctor.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Editable Fields Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Lab Management</CardTitle>
                  <CardDescription>Update order details and specifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="restoration_type">Restoration Type</Label>
                      <Input
                        id="restoration_type"
                        value={editableFields.restoration_type}
                        onChange={(e) => setEditableFields({ ...editableFields, restoration_type: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="teeth_shade">Teeth Shade</Label>
                      <Input
                        id="teeth_shade"
                        value={editableFields.teeth_shade}
                        onChange={(e) => setEditableFields({ ...editableFields, teeth_shade: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="biological_notes">Clinical Notes & Modifications</Label>
                    <Textarea
                      id="biological_notes"
                      value={editableFields.biological_notes}
                      onChange={(e) => setEditableFields({ ...editableFields, biological_notes: e.target.value })}
                      placeholder="Add any clinical notes, material changes, or special instructions..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="expected_delivery_date" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Expected Delivery Date
                      </Label>
                      <Input
                        id="expected_delivery_date"
                        type="date"
                        value={editableFields.expected_delivery_date}
                        onChange={(e) => setEditableFields({ ...editableFields, expected_delivery_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipment_tracking" className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Shipment Tracking
                      </Label>
                      <Input
                        id="shipment_tracking"
                        value={editableFields.shipment_tracking}
                        onChange={(e) => setEditableFields({ ...editableFields, shipment_tracking: e.target.value })}
                        placeholder="Tracking number..."
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>

              {/* Shipment Details Section */}
              <Card className={order.status === 'Pending' ? "opacity-50 pointer-events-none" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Shipment Details
                      </CardTitle>
                      <CardDescription>
                        {order.status === 'Pending' 
                          ? "Shipment section will activate once order status is updated"
                          : "Enter driver and shipment information"
                        }
                      </CardDescription>
                    </div>
                    {order.status === 'Pending' && (
                      <Badge variant="secondary">Locked</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="driver_name">Driver's Name</Label>
                      <Input
                        id="driver_name"
                        value={shipmentDetails.driver_name}
                        onChange={(e) => setShipmentDetails({ ...shipmentDetails, driver_name: e.target.value })}
                        placeholder="Full name"
                        disabled={order.status === 'Pending'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="driver_phone_whatsapp">Phone / WhatsApp</Label>
                      <Input
                        id="driver_phone_whatsapp"
                        value={shipmentDetails.driver_phone_whatsapp}
                        onChange={(e) => setShipmentDetails({ ...shipmentDetails, driver_phone_whatsapp: e.target.value })}
                        placeholder="+1234567890"
                        disabled={order.status === 'Pending'}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="carrier_name">Carrier Name</Label>
                      <Input
                        id="carrier_name"
                        value={shipmentDetails.carrier_name}
                        onChange={(e) => setShipmentDetails({ ...shipmentDetails, carrier_name: e.target.value })}
                        placeholder="FedEx, UPS, etc."
                        disabled={order.status === 'Pending'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="carrier_phone">Carrier Phone</Label>
                      <Input
                        id="carrier_phone"
                        value={shipmentDetails.carrier_phone}
                        onChange={(e) => setShipmentDetails({ ...shipmentDetails, carrier_phone: e.target.value })}
                        placeholder="Carrier contact number"
                        disabled={order.status === 'Pending'}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pickup_time">Pickup Time</Label>
                    <Input
                      id="pickup_time"
                      type="datetime-local"
                      value={shipmentDetails.pickup_time}
                      onChange={(e) => setShipmentDetails({ ...shipmentDetails, pickup_time: e.target.value })}
                      disabled={order.status === 'Pending'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tracking_location">Tracking Location</Label>
                    <Input
                      id="tracking_location"
                      value={shipmentDetails.tracking_location}
                      onChange={(e) => setShipmentDetails({ ...shipmentDetails, tracking_location: e.target.value })}
                      placeholder="Current location or address"
                      disabled={order.status === 'Pending'}
                    />
                  </div>

                  <div>
                    <Label htmlFor="shipment_notes">Additional Notes</Label>
                    <Textarea
                      id="shipment_notes"
                      value={shipmentDetails.shipment_notes}
                      onChange={(e) => setShipmentDetails({ ...shipmentDetails, shipment_notes: e.target.value })}
                      placeholder="Special handling instructions, delivery notes, etc."
                      className="min-h-[100px]"
                      disabled={order.status === 'Pending'}
                    />
                  </div>

                  <Button 
                    onClick={handleSaveShipment} 
                    disabled={isSavingShipment || order.status === 'Pending'} 
                    className="w-full"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {isSavingShipment ? "Saving..." : "Save Shipment Details"}
                  </Button>
                </CardContent>
              </Card>

              {/* Read-only Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Details (Doctor-Set)</CardTitle>
                  <CardDescription>Information set by the ordering doctor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Patient Name</Label>
                      <p className="font-medium">{order.patient_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Doctor Name</Label>
                      <p className="font-medium">Dr. {order.doctor_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Teeth Number</Label>
                      <p className="font-medium">{order.teeth_number}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Shade System</Label>
                      <p className="font-medium">{order.shade_system || "VITA Classical"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Order Date</Label>
                      <p className="font-medium">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Urgency</Label>
                      <Badge variant={order.urgency === 'Urgent' ? 'destructive' : 'secondary'}>
                        {order.urgency}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Design File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Design File Upload
                  </CardTitle>
                  <CardDescription>Upload CAD/CAM files, scans, or design documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.design_file_url && (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        Current file uploaded. <a href={order.design_file_url} target="_blank" rel="noopener noreferrer" className="underline">Download</a>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.stl,.dcm,.zip"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={!selectedFile || isUploadingFile}
                    >
                      {isUploadingFile ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allowed: PDF, STL, DICOM, ZIP • Max 10MB
                  </p>
                </CardContent>
              </Card>

              {/* Tabs for QC and History */}
              <Tabs defaultValue="qc" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="qc" className="flex-1">Quality Control</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">Audit Trail</TabsTrigger>
                </TabsList>
                <TabsContent value="qc">
                  <Card>
                    <CardHeader>
                      <CardTitle>QC Checklist</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <QCChecklist 
                        orderId={order.id} 
                        orderStatus={order.status}
                        onStatusUpdateAllowed={() => {}}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="history">
                  <Card>
                    <CardHeader>
                      <CardTitle>Order History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <OrderHistoryTimeline 
                        orderId={order.id}
                        orderNumber={order.order_number}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowStatusDialog(true)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowNotesDialog(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    View Comments
                  </Button>
                  {order.html_export && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        const isUrl = order.html_export?.startsWith('http://') || order.html_export?.startsWith('https://');
                        if (isUrl) {
                          window.open(order.html_export!, '_blank', 'noopener,noreferrer');
                        } else {
                          const previewWindow = window.open('', '_blank');
                          if (previewWindow && order.html_export) {
                            previewWindow.document.write(order.html_export);
                            previewWindow.document.close();
                          }
                        }
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Order Form
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Quick Comment */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Comment</CardTitle>
                  <CardDescription>Send message to doctor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your message..."
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Comment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <OrderStatusDialog
        orderId={order.id}
        orderNumber={order.order_number}
        currentStatus={order.status as any}
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        onStatusUpdated={fetchOrder}
      />
      
      <OrderNotesDialog
        orderId={order.id}
        orderNumber={order.order_number}
        open={showNotesDialog}
        onOpenChange={setShowNotesDialog}
      />
      
      <LandingFooter />
    </div>
  );
};

export default LabOrderDetail;
