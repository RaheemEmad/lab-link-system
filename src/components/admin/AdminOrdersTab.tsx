import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ExportDropdown from "@/components/ui/export-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search, Pencil, Trash2, ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OrderDetailsModal } from "@/components/order/OrderDetailsModal";
import { LabReassignDialog } from "@/components/admin/LabReassignDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Order {
  id: string;
  order_number: string;
  doctor_name: string;
  patient_name: string;
  restoration_type: string;
  status: string;
  urgency: string;
  created_at: string;
  assigned_lab_id: string | null;
  expected_delivery_date: string | null;
  doctor_id: string | null;
  desired_delivery_date: string | null;
  biological_notes: string | null;
  teeth_number: string;
  teeth_shade: string;
  shade_system: string | null;
  assigned_lab?: { name: string } | null;
  driver_name: string | null;
  driver_phone_whatsapp: string | null;
  carrier_name: string | null;
  carrier_phone: string | null;
  handling_instructions: string | null;
  approval_notes: string | null;
}

const PAGE_SIZE = 50;

const AdminOrdersTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [labReassignDialogOpen, setLabReassignDialogOpen] = useState(false);
  const [orderToReassign, setOrderToReassign] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  // Server-side paginated query with explicit column selection
  const { data, isLoading: loading, refetch: fetchOrders } = useQuery({
    queryKey: ["admin-orders", statusFilter, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          id, order_number, doctor_name, patient_name, restoration_type, status, urgency,
          created_at, assigned_lab_id, expected_delivery_date, doctor_id, desired_delivery_date,
          biological_notes, teeth_number, teeth_shade, shade_system, driver_name,
          driver_phone_whatsapp, carrier_name, carrier_phone, handling_instructions, approval_notes,
          assigned_lab:labs(name)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { orders: (data || []) as Order[], totalCount: count || 0 };
    },
    staleTime: 15_000,
    gcTime: 2 * 60_000,
    retry: 1,
  });

  const orders = data?.orders || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      if (!user) {
        toast.error("Unauthorized");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (roleError || !roleData) {
        toast.error("Admin access required");
        return;
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete.id);

      if (error) throw error;

      toast.success(`Order ${orderToDelete.order_number} deleted successfully`);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      fetchOrders();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Failed to delete order";
      toast.error(message);
    }
  };

  const handleViewOrder = (order: Order) => {
    setOrderToView(order);
    setViewDialogOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    navigate(`/edit-order/${order.id}`);
  };

  const confirmDelete = (order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleReassignLab = (order: Order) => {
    setOrderToReassign(order);
    setLabReassignDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-500";
      case "In Progress": return "bg-blue-500";
      case "Ready for QC": return "bg-purple-500";
      case "Ready for Delivery": return "bg-orange-500";
      case "Delivered": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  // Client-side search filter (on current page data)
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(q) ||
      order.doctor_name.toLowerCase().includes(q) ||
      order.patient_name.toLowerCase().includes(q) ||
      order.restoration_type.toLowerCase().includes(q)
    );
  });

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.size === 0) return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as any })
        .in("id", Array.from(selectedOrders));

      if (error) throw error;

      toast.success(`Updated ${selectedOrders.size} order(s) to ${newStatus}`);
      setSelectedOrders(new Set());
      setBulkAction("");
      fetchOrders();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Bulk update failed";
      toast.error(message);
    }
  };

  const exportOrdersCSV = async () => {
    const { exportToCSV, prepareOrdersForExport } = await import("@/lib/exportUtils");
    const exportData = prepareOrdersForExport(filteredOrders);
    exportToCSV(exportData, `orders-export-${new Date().toISOString().split("T")[0]}`);
    toast.success("Orders exported as CSV");
  };

  const exportOrdersPDF = async () => {
    const { exportToPDF, prepareOrdersForExport } = await import("@/lib/exportUtils");
    const exportData = prepareOrdersForExport(filteredOrders);
    exportToPDF(exportData, "Orders Export", `orders-export-${new Date().toISOString().split("T")[0]}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Management</CardTitle>
        <CardDescription>
          View and monitor all orders in the system ({totalCount} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, doctor, patient, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            className="px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Ready for QC">Ready for QC</option>
            <option value="Ready for Delivery">Ready for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>
          <ExportDropdown onExportCSV={exportOrdersCSV} onExportPDF={exportOrdersPDF} />
        </div>

        {selectedOrders.size > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-md flex-wrap">
            <span className="text-sm font-medium">{selectedOrders.size} selected</span>
            <select
              value={bulkAction}
              onChange={(e) => {
                setBulkAction(e.target.value);
                if (e.target.value) handleBulkStatusUpdate(e.target.value);
              }}
              className="px-3 py-1 border border-input rounded-md bg-background text-sm"
            >
              <option value="">Update Status...</option>
              <option value="In Progress">In Progress</option>
              <option value="Ready for QC">Ready for QC</option>
              <option value="Ready for Delivery">Ready for Delivery</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Lab Assigned</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.doctor_name}</TableCell>
                  <TableCell>{order.patient_name}</TableCell>
                  <TableCell>{order.restoration_type}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>{order.urgency}</Badge>
                  </TableCell>
                  <TableCell>
                    {order.assigned_lab_id ? (
                      <Badge variant="outline">Assigned</Badge>
                    ) : (
                      <Badge variant="secondary">Marketplace</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.expected_delivery_date
                      ? new Date(order.expected_delivery_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Details</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleEditOrder(order)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Order</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleReassignLab(order)}>
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reassign Lab</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(order)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Order</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Server-side Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages} ({totalCount} orders)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* View Order Details Dialog */}
        {orderToView && (
          <OrderDetailsModal
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            order={{
              ...orderToView,
              assigned_lab: orderToView.assigned_lab || null,
            }}
          />
        )}

        {/* Lab Reassignment Dialog */}
        <LabReassignDialog
          open={labReassignDialogOpen}
          onOpenChange={setLabReassignDialogOpen}
          order={orderToReassign}
          onSuccess={() => fetchOrders()}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Order?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete order{" "}
                <span className="font-semibold">{orderToDelete?.order_number}</span> for patient{" "}
                <span className="font-semibold">{orderToDelete?.patient_name}</span>?
                <br /><br />
                This action cannot be undone. All associated notes, attachments, and history will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AdminOrdersTab;
