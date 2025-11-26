import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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
import { Search, Filter, MoreVertical, Pencil, Trash2, RefreshCw, History, MessageSquare, FileText, Building2, Mail, Phone, ExternalLink, MessageCircle, User, Palette, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { OrderStatusDialog } from "./order/OrderStatusDialog";
import { OrderHistoryTimeline } from "./order/OrderHistoryTimeline";
import OrderNotesDialog from "./order/OrderNotesDialog";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-card";
import { OrderChatWindow } from "./chat/OrderChatWindow";

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
  html_export: string | null;
  screenshot_url: string | null;
  assigned_lab_id: string | null;
  labs: {
    id: string;
    name: string;
    contact_email: string;
    contact_phone: string | null;
    description: string | null;
  } | null;
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
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState<Order | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    // Only fetch orders once userRole is determined
    if (userRole) {
      fetchOrders();
    }
    
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
  }, [user, userRole]);

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
      let query = supabase
        .from("orders")
        .select(`
          *,
          labs (
            id,
            name,
            contact_email,
            contact_phone,
            description
          )
        `)
        .order("timestamp", { ascending: false });

      if (userRole === "doctor") {
        query = query.eq("doctor_id", user.id);
      } else if (userRole === "lab_staff") {
        query = query.not("assigned_lab_id", "is", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Failed to fetch orders:", error.message);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Order deleted successfully");
      fetchOrders();
    } catch (error: any) {
      console.error("Failed to delete order:", error.message);
      toast.error("Failed to delete order");
    } finally {
      setDeleteOrderId(null);
    }
  };

  const handleEdit = (orderId: string) => {
    navigate(`/edit-order/${orderId}`);
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

  const handleOpenChat = (order: Order) => {
    setChatOrder(order);
    setChatDialogOpen(true);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.doctor_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const isDoctor = userRole === "doctor";
  const isLabStaff = userRole === "lab_staff";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Orders...</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card data-tour="order-dashboard">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Order Management
            {orders.length > 0 && (
              <Badge variant="secondary">{orders.length} total</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
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

              <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3" data-tour="orders-cards">
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-base sm:text-lg font-medium mb-2">No orders found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              paginatedOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-sm mb-1">{order.order_number}</div>
                        {!isDoctor && (
                          <div className="text-xs text-muted-foreground truncate">Dr. {order.doctor_name}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"} className="text-xs">
                          {order.urgency}
                        </Badge>
                        <Badge variant="outline" className={`${statusColors[order.status]} text-xs`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{order.patient_name}</span>
                    </div>

                    {/* Restoration Details */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{order.restoration_type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        <span>{order.teeth_shade}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span>{order.teeth_number}</span>
                      </div>
                    </div>

                    {/* Lab Info */}
                    <div className="pt-2 border-t border-border">
                      {order.labs ? (
                        <button
                          onClick={() => navigate(`/labs/${order.labs!.id}`)}
                          className="flex items-center gap-2 hover:text-primary transition-colors w-full text-left group"
                        >
                          <div className="relative w-8 h-8 rounded overflow-hidden border border-border bg-muted flex-shrink-0 group-hover:border-primary transition-colors">
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{order.labs.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{order.labs.contact_email}</div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </button>
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Not assigned
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {order.html_export && (
                        <Button
                          size="sm"
                          variant="outline"
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
                          className="flex-1"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="min-w-[44px]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                          {order.assigned_lab_id && (
                            <>
                              <DropdownMenuItem onClick={() => handleOpenChat(order)}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Open Chat
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
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
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border overflow-x-auto" data-tour="orders-table">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  {!isDoctor && <TableHead>Doctor</TableHead>}
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Teeth</TableHead>
                  <TableHead>Lab</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isDoctor ? 10 : 11} className="text-center py-8 sm:py-12">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 sm:h-12 sm:w-12 mb-4 text-muted-foreground opacity-50" />
                        <p className="text-base sm:text-lg font-medium mb-2">No orders found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {paginatedOrders.map((order) => (
                      <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                      {!isDoctor && <TableCell>{order.doctor_name}</TableCell>}
                      <TableCell>{order.patient_name}</TableCell>
                      <TableCell>{order.restoration_type}</TableCell>
                      <TableCell>{order.teeth_shade}</TableCell>
                      <TableCell>{order.teeth_number}</TableCell>
                      <TableCell>
                        {order.labs ? (
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <button
                                onClick={() => navigate(`/labs/${order.labs!.id}`)}
                                className="flex items-center gap-2 hover:text-primary transition-colors group"
                              >
                                <div className="relative w-8 h-8 rounded overflow-hidden border border-border bg-muted flex-shrink-0 group-hover:border-primary transition-colors">
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </div>
                                </div>
                                <span className="text-sm font-medium truncate max-w-[120px]">{order.labs.name}</span>
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-80">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {order.labs.name}
                                  </h4>
                                  {order.labs.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{order.labs.description}</p>
                                  )}
                                </div>
                                <div className="space-y-1 text-sm">
                                  {order.labs.contact_email && (
                                    <p className="flex items-center gap-2">
                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                      <span className="truncate">{order.labs.contact_email}</span>
                                    </p>
                                  )}
                                  {order.labs.contact_phone && (
                                    <p className="flex items-center gap-2">
                                      <Phone className="h-3 w-3 text-muted-foreground" />
                                      {order.labs.contact_phone}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => navigate(`/labs/${order.labs!.id}`)}
                                >
                                  View Lab Profile
                                  <ExternalLink className="h-3 w-3 ml-2" />
                                </Button>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"} className="whitespace-nowrap">
                          {order.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusColors[order.status]} whitespace-nowrap`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.html_export && (
                          <button
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
                            className="relative w-12 h-12 rounded overflow-hidden border border-border bg-muted hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                            title="Click to preview HTML export"
                          >
                            {order.screenshot_url ? (
                              <img 
                                src={order.screenshot_url} 
                                alt="HTML Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                            {order.assigned_lab_id && (
                              <>
                                <DropdownMenuItem onClick={() => handleOpenChat(order)}>
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Open Chat
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
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
                ))}
              </>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              
              <Pagination>
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // On mobile, show fewer pages
                    const showOnMobile = page === 1 || page === totalPages || page === currentPage;
                    const showOnDesktop = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    if (showOnDesktop) {
                      return (
                        <PaginationItem key={page} className={!showOnMobile ? "hidden sm:inline-flex" : ""}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page} className="hidden sm:inline-flex">
                          <span className="px-4">...</span>
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedOrder && (
        <OrderStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          currentStatus={selectedOrder.status as OrderStatus}
          onStatusUpdated={fetchOrders}
        />
      )}

      {historyOrder && (
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order History: {historyOrder.order_number}</DialogTitle>
            </DialogHeader>
            <OrderHistoryTimeline orderId={historyOrder.id} orderNumber={historyOrder.order_number} />
          </DialogContent>
        </Dialog>
      )}

      {notesOrder && (
        <OrderNotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          orderId={notesOrder.id}
          orderNumber={notesOrder.order_number}
        />
      )}

      {chatOrder && (
        <OrderChatWindow
          orderId={chatOrder.id}
          orderNumber={chatOrder.order_number}
          currentUserRole={isDoctor ? 'doctor' : 'lab_staff'}
          onClose={() => {
            setChatDialogOpen(false);
            setChatOrder(null);
          }}
        />
      )}

      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrderId && handleDelete(deleteOrderId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default OrderDashboard;
