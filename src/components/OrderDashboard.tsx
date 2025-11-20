import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Search, Filter, MoreVertical, Pencil, Trash2, RefreshCw, History, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { OrderStatusDialog } from "./order/OrderStatusDialog";
import { OrderHistoryTimeline } from "./order/OrderHistoryTimeline";
import OrderNotesDialog from "./order/OrderNotesDialog";

type OrderStatus = "Pending" | "In Progress" | "Ready for QC" | "Ready for Delivery" | "Delivered";

interface Order {
  id: string;
  order_number: string;
  doctor_name: string;
  patient_name: string;
  restoration_type: string;
  teeth_shade: string;
  teeth_number: string;
  urgency: string;
  status: OrderStatus;
  timestamp: string;
}

const statusColors: Record<OrderStatus, string> = {
  "Pending": "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  "Ready for QC": "bg-accent/10 text-accent border-accent/20",
  "Ready for Delivery": "bg-primary/10 text-primary border-primary/20",
  "Delivered": "bg-success/10 text-success border-success/20",
};

const OrderDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesOrder, setNotesOrder] = useState<Order | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    fetchUserRole();
    
    // Set up realtime subscription for order updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order update received:', payload);
          fetchOrders(); // Refresh orders on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserRole(data?.role || "");
    } catch (error: any) {
      console.error("Failed to fetch user role:", error.message);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to load orders", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrderId) return;

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", deleteOrderId);

      if (error) throw error;

      toast.success("Order deleted successfully");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to delete order", {
        description: error.message,
      });
    } finally {
      setDeleteOrderId(null);
    }
  };

  const handleEdit = (orderId: string) => {
    // Navigate to edit page (you can create this later)
    toast.info("Edit functionality coming soon", {
      description: "Order ID: " + orderId,
    });
  };

  const handleStatusUpdate = (order: Order) => {
    setSelectedOrder(order);
    setStatusDialogOpen(true);
  };

  const handleViewHistory = (order: Order) => {
    setHistoryOrder(order);
    setHistoryDialogOpen(true);
  };

  const handleViewNotes = (order: Order) => {
    setNotesOrder(order);
    setNotesDialogOpen(true);
  };

  const isLabStaff = userRole === "lab_staff" || userRole === "admin";

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "Pending").length,
    inProgress: orders.filter(o => o.status === "In Progress").length,
    delivered: orders.filter(o => o.status === "Delivered").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  const isDoctor = userRole === "doctor";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-warning">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-info">{stats.inProgress}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Ready for QC">Ready for QC</SelectItem>
                <SelectItem value="Ready for Delivery">Ready for Delivery</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders Table - Scrollable on mobile */}
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  {!isDoctor && <TableHead>Doctor</TableHead>}
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Teeth</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isDoctor ? 8 : 9} className="text-center text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                      {!isDoctor && <TableCell>{order.doctor_name}</TableCell>}
                      <TableCell>{order.patient_name}</TableCell>
                      <TableCell>{order.restoration_type}</TableCell>
                      <TableCell>{order.teeth_shade}</TableCell>
                      <TableCell>{order.teeth_number}</TableCell>
                      <TableCell>
                        <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"}>
                          {order.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[order.status]}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuItem onClick={() => handleViewHistory(order)}>
                              <History className="mr-2 h-4 w-4" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewNotes(order)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              View Notes
                            </DropdownMenuItem>
                            {isLabStaff && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Update Status
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(order.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteOrderId(order.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Status Update Dialog */}
      {selectedOrder && (
        <OrderStatusDialog
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          currentStatus={selectedOrder.status}
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          onStatusUpdated={fetchOrders}
        />
      )}

      {/* Order History Timeline Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Status History</DialogTitle>
          </DialogHeader>
          {historyOrder && (
            <OrderHistoryTimeline
              orderId={historyOrder.id}
              orderNumber={historyOrder.order_number}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Order Notes Dialog */}
      <OrderNotesDialog
        orderId={notesOrder?.id || null}
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        orderNumber={notesOrder?.order_number || ""}
      />
    </div>
  );
};

export default OrderDashboard;
