import { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { openSanitizedHtmlPreview } from "@/lib/htmlSanitize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import ExportDropdown from "@/components/ui/export-dropdown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
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
import { Search, MoreVertical, Pencil, Trash2, RefreshCw, History, MessageSquare, FileText, Building2, Mail, Phone, ExternalLink, MessageCircle, User, Palette, Hash, MessageSquareMore, CheckSquare, X, ArrowUpDown, ArrowUp, ArrowDown, Download, Copy, Calendar, RotateCcw, Archive, SlidersHorizontal } from "lucide-react";
import { RestoreOrderDialog } from "./order/RestoreOrderDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { OrderStatusDialog } from "./order/OrderStatusDialog";
import { OrderHistoryTimeline } from "./order/OrderHistoryTimeline";
import { SkeletonCard, SkeletonTable } from "@/components/ui/skeleton-card";
import { cn } from "@/lib/utils";
import { useDialogState } from "./dashboard/useDialogState";
import { DashboardKPICards } from "./dashboard/DashboardKPICards";
import { OrderProgressStrip } from "./dashboard/OrderProgressStrip";
import { WorkloadHeatmap } from "./dashboard/WorkloadHeatmap";
import { OrderQuickView } from "./dashboard/OrderQuickView";
import { SavedFilters } from "./dashboard/SavedFilters";
import { format, isAfter, isBefore, addDays, startOfWeek, startOfMonth, subDays } from "date-fns";

// Lazy-load heavy dialog components
const OrderNotesDialog = lazy(() => import("./order/OrderNotesDialog"));
const OrderChatWindow = lazy(() => import("./chat/OrderChatWindow").then(m => ({ default: m.OrderChatWindow })));

type OrderStatus = "Pending" | "In Progress" | "Ready for QC" | "Ready for Delivery" | "Delivered" | "Cancelled";

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
  delivery_pending_confirmation: boolean | null;
  expected_delivery_date: string | null;
  shade_system: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  pre_delete_status?: string | null;
  labs: {
    id: string;
    name: string;
    contact_email: string;
    contact_phone: string | null;
    description: string | null;
  } | null;
}

type SortField = "order_number" | "patient_name" | "restoration_type" | "urgency" | "status" | "timestamp" | "expected_delivery_date";
type SortDirection = "asc" | "desc";

const statusColors: Record<OrderStatus | "Awaiting Confirmation", string> = {
  "Pending": "bg-warning/10 text-warning border-warning/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  "Ready for QC": "bg-accent/10 text-accent border-accent/20",
  "Ready for Delivery": "bg-primary/10 text-primary border-primary/20",
  "Delivered": "bg-success/10 text-success border-success/20",
  "Cancelled": "bg-destructive/10 text-destructive border-destructive/20",
  "Awaiting Confirmation": "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

const getDisplayStatus = (order: Order): string => {
  if (order.delivery_pending_confirmation && order.status === "Ready for Delivery") {
    return "Awaiting Confirmation";
  }
  return order.status;
};

// Valid status transitions for bulk updates
const BULK_STATUS_OPTIONS: { value: OrderStatus; label: string; roles: string[] }[] = [
  { value: "In Progress", label: "In Progress", roles: ["lab_staff"] },
  { value: "Ready for QC", label: "Ready for QC", roles: ["lab_staff"] },
  { value: "Ready for Delivery", label: "Ready for Delivery", roles: ["lab_staff"] },
  { value: "Cancelled", label: "Cancelled", roles: ["doctor", "lab_staff"] },
];

// Deadline color helper
const getDeadlineColor = (dateStr: string | null): string => {
  if (!dateStr) return "text-muted-foreground";
  const deadline = new Date(dateStr);
  const now = new Date();
  if (isBefore(deadline, now)) return "text-destructive font-medium";
  if (isBefore(deadline, addDays(now, 3))) return "text-warning font-medium";
  return "text-success";
};

const OrderDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [kpiFilter, setKpiFilter] = useState<import("./dashboard/DashboardKPICards").KPIFilter | null>(null);
  const ordersTableRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [loading, setLoading] = useState(true);
  const dialog = useDialogState<Order>();
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [quickViewOrder, setQuickViewOrder] = useState<Order | null>(null);
  const [showDeletedOrders, setShowDeletedOrders] = useState(false);
  const [deletedOrders, setDeletedOrders] = useState<(Order & { pre_delete_status?: string | null })[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [restoreOrder, setRestoreOrder] = useState<{ id: string; order_number: string; pre_delete_status: string | null } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  const { user } = useAuth();
  const { isDoctor, isLabStaff, isLoading: roleLoading, labId, role } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || roleLoading) return;
    
    fetchOrders();
    
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, roleLoading, isDoctor, isLabStaff]);

  const fetchOrders = async () => {
    if (!user || roleLoading) return;

    try {
      setLoading(true);
      
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
        .eq("is_deleted", false)
        .order("timestamp", { ascending: false });

      if (isDoctor) {
        query = query.eq("doctor_id", user.id);
      } else if (isLabStaff) {
        query = query.not("assigned_lab_id", "is", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('[OrderDashboard] Failed to fetch orders:', error.message);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const { error } = await supabase
        .from("orders")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          pre_delete_status: order?.status || "Pending",
        })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Order moved to trash. You can restore it from Deleted Orders.");
      fetchOrders();
    } catch (error: any) {
      console.error("Failed to delete order:", error.message);
      toast.error("Failed to delete order");
    } finally {
      setDeleteOrderId(null);
    }
  };

  const fetchDeletedOrders = async () => {
    if (!user || !isDoctor) return;
    setDeletedLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, labs (id, name, contact_email, contact_phone, description)`)
        .eq("is_deleted", true)
        .eq("doctor_id", user.id)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      setDeletedOrders((data || []) as any);
    } catch (error: any) {
      toast.error("Failed to load deleted orders");
    } finally {
      setDeletedLoading(false);
    }
  };

  useEffect(() => {
    if (showDeletedOrders) fetchDeletedOrders();
  }, [showDeletedOrders]);

  const handleEdit = (orderId: string) => navigate(`/edit-order/${orderId}`);
  const handleStatusUpdate = (order: Order) => dialog.open("status", order);
  const handleViewHistory = (order: Order) => dialog.open("history", order);
  const handleViewNotes = (order: Order) => dialog.open("notes", order);
  const handleOpenChat = (order: Order) => dialog.open("chat", order);

  // Reorder handler for doctors
  const handleReorder = (order: Order) => {
    const params = new URLSearchParams();
    if (order.patient_name) params.set("patient_name", order.patient_name);
    if (order.restoration_type) params.set("restoration_type", order.restoration_type);
    if (order.teeth_shade) params.set("teeth_shade", order.teeth_shade);
    if (order.teeth_number) params.set("teeth_number", order.teeth_number);
    if (order.shade_system) params.set("shade_system", order.shade_system);
    navigate(`/new-order?${params.toString()}`);
  };

  // Bulk selection handlers
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === paginatedOrders.length) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
  };

  const clearSelection = () => setSelectedOrders(new Set());

  const handleBulkStatusUpdate = async (newStatus: OrderStatus) => {
    if (selectedOrders.size === 0) return;
    setBulkUpdating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const orderId of selectedOrders) {
        const { error } = await supabase
          .from("orders")
          .update({ status: newStatus, status_updated_at: new Date().toISOString() })
          .eq("id", orderId);

        if (error) { failCount++; } else {
          await supabase.from("order_status_history").insert({
            order_id: orderId,
            old_status: orders.find(o => o.id === orderId)?.status || "Pending",
            new_status: newStatus,
            changed_by: user?.id,
            notes: "Bulk status update"
          });
          successCount++;
        }
      }

      if (successCount > 0) toast.success(`Updated ${successCount} order${successCount > 1 ? 's' : ''} to ${newStatus}`);
      if (failCount > 0) toast.error(`Failed to update ${failCount} order${failCount > 1 ? 's' : ''}`);

      setSelectedOrders(new Set());
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to update orders");
    } finally {
      setBulkUpdating(false);
      setBulkStatusDialogOpen(false);
    }
  };

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Filtered + sorted orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let result = orders.filter((order) => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.doctor_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // KPI filter takes priority over status dropdown
      let matchesStatus = true;
      if (kpiFilter) {
        if (kpiFilter.status === "active") {
          matchesStatus = !["Delivered", "Cancelled"].includes(order.status);
        } else if (kpiFilter.status) {
          matchesStatus = order.status === kpiFilter.status;
        }
        if (kpiFilter.urgency) {
          matchesStatus = matchesStatus && order.urgency === kpiFilter.urgency && !["Delivered", "Cancelled"].includes(order.status);
        }
      } else {
        matchesStatus = statusFilter === "all" || order.status === statusFilter;
      }

      // Date range filter
      let matchesDate = true;
      if (dateRange !== "all") {
        const orderDate = new Date(order.timestamp);
        if (dateRange === "week") matchesDate = isAfter(orderDate, startOfWeek(now));
        else if (dateRange === "month") matchesDate = isAfter(orderDate, startOfMonth(now));
        else if (dateRange === "30days") matchesDate = isAfter(orderDate, subDays(now, 30));
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort
    result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (sortField) {
        case "order_number": valA = a.order_number; valB = b.order_number; break;
        case "patient_name": valA = a.patient_name.toLowerCase(); valB = b.patient_name.toLowerCase(); break;
        case "restoration_type": valA = a.restoration_type; valB = b.restoration_type; break;
        case "urgency": valA = a.urgency === "Urgent" ? 0 : 1; valB = b.urgency === "Urgent" ? 0 : 1; break;
        case "status": valA = a.status; valB = b.status; break;
        case "timestamp": valA = a.timestamp; valB = b.timestamp; break;
        case "expected_delivery_date": valA = a.expected_delivery_date || "9999"; valB = b.expected_delivery_date || "9999"; break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, searchTerm, statusFilter, dateRange, sortField, sortDirection, kpiFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const availableBulkStatuses = BULK_STATUS_OPTIONS.filter(opt => 
    opt.roles.includes(isDoctor ? "doctor" : "lab_staff")
  );

  // Batch Export handlers
  const buildExportRows = () =>
    filteredOrders.map(o => ({
      OrderNumber: o.order_number,
      Patient: o.patient_name,
      Doctor: o.doctor_name,
      Type: o.restoration_type,
      Shade: o.teeth_shade,
      Teeth: o.teeth_number,
      Urgency: o.urgency,
      Status: o.status,
      Lab: o.labs?.name || "Unassigned",
      Deadline: o.expected_delivery_date || "",
      Created: o.timestamp,
    }));

  const handleExportCSV = async () => {
    const { exportToCSV } = await import("@/lib/exportUtils");
    exportToCSV(buildExportRows(), `orders-export-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success("Orders exported to CSV");
  };

  const handleExportPDF = async () => {
    const { exportToPDF } = await import("@/lib/exportUtils");
    exportToPDF(buildExportRows(), "Orders Export", `orders-export-${format(new Date(), "yyyy-MM-dd")}`);
  };

  // Load preset handler
  const handleLoadPreset = (preset: { statusFilter: string; dateRange: string; searchTerm: string }) => {
    setStatusFilter(preset.statusFilter);
    setDateRange(preset.dateRange);
    setSearchTerm(preset.searchTerm);
    setCurrentPage(1);
  };

  if (loading || roleLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Loading Orders...</CardTitle></CardHeader>
        <CardContent><SkeletonTable /></CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div onClick={(e) => { if (e.target === e.currentTarget && kpiFilter) setKpiFilter(null); }}>
      {/* KPI Cards */}
      <div className="mb-4">
        <DashboardKPICards
          orders={orders}
          isLabStaff={!!isLabStaff}
          activeFilter={kpiFilter?.key || null}
          onFilterChange={(filter) => {
            setKpiFilter(filter);
            if (filter) {
              setStatusFilter("all");
              setCurrentPage(1);
              setTimeout(() => {
                ordersTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }
          }}
        />
      </div>

      {/* Workload Heatmap (Lab only) */}
      {isLabStaff && orders.length > 0 && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <WorkloadHeatmap orders={orders} />
          </CardContent>
        </Card>
      )}

      <Card data-tour="order-dashboard" ref={ordersTableRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Order Management
            {orders.length > 0 && (
              <Badge variant="secondary">{orders.length} total</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Action Toolbar */}
          {selectedOrders.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium text-sm">
                {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setBulkStatusDialogOpen(true)} disabled={availableBulkStatuses.length === 0}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Status
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          )}

          {/* Filters and Search */}
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setKpiFilter(null); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] sm:min-h-0">
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

              {/* Date Range Filter */}
              <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[160px] min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                <SelectTrigger className="w-full sm:w-[120px] min-h-[44px] sm:min-h-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>

              {/* Saved Filters & Export */}
              <div className="flex gap-2">
                {user && (
                  <SavedFilters
                    userId={user.id}
                    currentFilters={{ statusFilter, dateRange, searchTerm }}
                    onLoadPreset={handleLoadPreset}
                  />
                )}
                <ExportDropdown onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} disabled={filteredOrders.length === 0} />
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3 stagger-fade-in" data-tour="orders-cards">
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-base sm:text-lg font-medium mb-2">No orders found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              paginatedOrders.map((order) => (
                <Card
                  key={order.id}
                  className={cn("overflow-hidden cursor-pointer hover:border-primary/40 transition-all duration-200 active:scale-[0.98]", selectedOrders.has(order.id) && "ring-2 ring-primary")}
                  onClick={() => setQuickViewOrder(order)}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header with Checkbox */}
                    <div className="flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono font-bold text-sm mb-1">{order.order_number}</div>
                          {!isDoctor && (
                            <div className="text-xs text-muted-foreground truncate">Dr. {order.doctor_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant={order.urgency === "Urgent" ? "destructive" : "secondary"} className="text-xs">
                          {order.urgency}
                        </Badge>
                        <Badge variant="outline" className={`${statusColors[getDisplayStatus(order) as keyof typeof statusColors]} text-xs`}>
                          {getDisplayStatus(order)}
                        </Badge>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{order.patient_name}</span>
                    </div>

                    {/* Progress Strip for doctors */}
                    {isDoctor && <OrderProgressStrip status={order.status} />}

                    {/* Deadline for lab */}
                    {isLabStaff && order.expected_delivery_date && (
                      <div className={cn("flex items-center gap-1 text-xs", getDeadlineColor(order.expected_delivery_date))}>
                        <Calendar className="h-3 w-3" />
                        Due: {format(new Date(order.expected_delivery_date), "MMM d")}
                      </div>
                    )}

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
                    <div className="pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
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
                    <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      {order.html_export && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const isUrl = order.html_export?.startsWith('http://') || order.html_export?.startsWith('https://');
                            if (isUrl) {
                              window.open(order.html_export!, '_blank', 'noopener,noreferrer');
                            } else {
                              openSanitizedHtmlPreview(order.html_export!);
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
                          <Button variant="outline" size="sm" className="min-w-[44px] min-h-[44px]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                          {order.assigned_lab_id && (
                            <>
                              <DropdownMenuItem onClick={() => { setTimeout(() => handleOpenChat(order), 150); }}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Open Chat
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/feedback-room/${order.id}`)}>
                                <MessageSquareMore className="mr-2 h-4 w-4" />
                                Feedback Room
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
                          {isDoctor && order.status === "Delivered" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleReorder(order)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Reorder
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                      onCheckedChange={toggleAllOrders}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("order_number")}>
                    <span className="flex items-center">Order ID <SortIcon field="order_number" /></span>
                  </TableHead>
                  {!isDoctor && <TableHead>Doctor</TableHead>}
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("patient_name")}>
                    <span className="flex items-center">Patient <SortIcon field="patient_name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("restoration_type")}>
                    <span className="flex items-center">Type <SortIcon field="restoration_type" /></span>
                  </TableHead>
                  <TableHead>Shade</TableHead>
                  <TableHead>Teeth</TableHead>
                  <TableHead>Lab</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("urgency")}>
                    <span className="flex items-center">Urgency <SortIcon field="urgency" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                    <span className="flex items-center">Status <SortIcon field="status" /></span>
                  </TableHead>
                  {isLabStaff && (
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("expected_delivery_date")}>
                      <span className="flex items-center">Deadline <SortIcon field="expected_delivery_date" /></span>
                    </TableHead>
                  )}
                  {isDoctor && <TableHead>Progress</TableHead>}
                  <TableHead>Preview</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isDoctor ? 13 : 14} className="text-center py-8 sm:py-12">
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
                      <TableRow
                        key={order.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          selectedOrders.has(order.id) && "bg-primary/5"
                        )}
                        onClick={() => setQuickViewOrder(order)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                        {!isDoctor && <TableCell>{order.doctor_name}</TableCell>}
                        <TableCell>{order.patient_name}</TableCell>
                        <TableCell>{order.restoration_type}</TableCell>
                        <TableCell>{order.teeth_shade}</TableCell>
                        <TableCell>{order.teeth_number}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                          <Badge variant="outline" className={`${statusColors[getDisplayStatus(order) as keyof typeof statusColors]} whitespace-nowrap`}>
                            {getDisplayStatus(order)}
                          </Badge>
                        </TableCell>
                        {isLabStaff && (
                          <TableCell>
                            {order.expected_delivery_date ? (
                              <span className={cn("text-xs whitespace-nowrap", getDeadlineColor(order.expected_delivery_date))}>
                                {format(new Date(order.expected_delivery_date), "MMM d, yyyy")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {isDoctor && (
                          <TableCell>
                            <OrderProgressStrip status={order.status} />
                          </TableCell>
                        )}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {order.html_export && (
                            <button
                              onClick={() => {
                                const isUrl = order.html_export?.startsWith('http://') || order.html_export?.startsWith('https://');
                                if (isUrl) {
                                  window.open(order.html_export!, '_blank', 'noopener,noreferrer');
                                } else {
                                  openSanitizedHtmlPreview(order.html_export!);
                                }
                              }}
                              className="relative w-12 h-12 rounded overflow-hidden border border-border bg-muted hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
                              title="Click to preview HTML export"
                            >
                              {order.screenshot_url ? (
                                <img src={order.screenshot_url} alt="HTML Preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                              {order.assigned_lab_id && (
                                <>
                                  <DropdownMenuItem onClick={() => { setTimeout(() => handleOpenChat(order), 150); }}>
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    Open Chat
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/feedback-room/${order.id}`)}>
                                    <MessageSquareMore className="mr-2 h-4 w-4" />
                                    Feedback Room
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
                              {isDoctor && order.status === "Delivered" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleReorder(order)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Reorder
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
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left order-2 sm:order-1">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              
              <div className="order-1 sm:order-2">
                <Pagination>
                  <PaginationContent className="flex-wrap gap-1">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const showOnMobile = page === 1 || page === totalPages || page === currentPage;
                      const showOnTablet = page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                      const showOnDesktop = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                      
                      if (showOnDesktop) {
                        return (
                          <PaginationItem 
                            key={page} 
                            className={cn(
                              !showOnMobile && "hidden xs:inline-flex",
                              !showOnTablet && "xs:hidden sm:inline-flex"
                            )}
                          >
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer w-8 h-8 sm:w-10 sm:h-10 active:scale-95 transition-transform"
                              size="sm"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if ((page === currentPage - 3 || page === currentPage + 3) && totalPages > 7) {
                        return (
                          <PaginationItem key={page} className="hidden sm:inline-flex">
                            <span className="px-2 text-muted-foreground">...</span>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick View Drawer */}
      <OrderQuickView
        order={quickViewOrder}
        open={!!quickViewOrder}
        onClose={() => setQuickViewOrder(null)}
        onOpenChat={handleOpenChat}
        onViewHistory={handleViewHistory}
        onViewNotes={handleViewNotes}
        onDeleteOrder={(id) => setDeleteOrderId(id)}
        isDoctor={!!isDoctor}
      />

      {/* Dialogs - using consolidated dialog state */}
      {dialog.state.data && dialog.isOpen("status") && (
        <OrderStatusDialog
          open={true}
          onOpenChange={() => dialog.close()}
          orderId={dialog.state.data.id}
          orderNumber={dialog.state.data.order_number}
          currentStatus={dialog.state.data.status as OrderStatus}
          onStatusUpdated={fetchOrders}
        />
      )}

      {dialog.state.data && dialog.isOpen("history") && (
        <Dialog open={true} onOpenChange={() => dialog.close()}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order History: {dialog.state.data.order_number}</DialogTitle>
            </DialogHeader>
            <OrderHistoryTimeline orderId={dialog.state.data.id} orderNumber={dialog.state.data.order_number} />
          </DialogContent>
        </Dialog>
      )}

      {dialog.state.data && dialog.isOpen("notes") && (
        <Suspense fallback={<div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>}>
          <OrderNotesDialog
            open={true}
            onOpenChange={() => dialog.close()}
            orderId={dialog.state.data.id}
            orderNumber={dialog.state.data.order_number}
          />
        </Suspense>
      )}

      {dialog.state.data && dialog.isOpen("chat") && (
        <Suspense fallback={<div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>}>
          <OrderChatWindow
            orderId={dialog.state.data.id}
            orderNumber={dialog.state.data.order_number}
            currentUserRole={isDoctor ? 'doctor' : 'lab_staff'}
            onClose={() => dialog.close()}
          />
        </Suspense>
      )}

      {/* Bulk Status Update Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status for {selectedOrders.size} Orders</DialogTitle>
            <DialogDescription>
              Select a new status to apply to all selected orders.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {availableBulkStatuses.map((status) => (
              <Button
                key={status.value}
                variant="outline"
                className="justify-start"
                onClick={() => handleBulkStatusUpdate(status.value)}
                disabled={bulkUpdating}
              >
                <Badge variant="outline" className={`${statusColors[status.value]} mr-2`}>
                  {status.label}
                </Badge>
                Set all to {status.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deleted Orders Section (Doctor only) */}
      {isDoctor && (
        <Card className="mt-4">
          <CardHeader className="cursor-pointer" onClick={() => setShowDeletedOrders(!showDeletedOrders)}>
            <CardTitle className="flex items-center gap-2 text-base">
              <Archive className="h-4 w-4 text-muted-foreground" />
              Deleted Orders
              {showDeletedOrders && deletedOrders.length > 0 && (
                <Badge variant="secondary">{deletedOrders.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          {showDeletedOrders && (
            <CardContent>
              {deletedLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : deletedOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deleted orders.</p>
              ) : (
                <div className="space-y-2">
                  {deletedOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium">{order.order_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.patient_name} • {order.restoration_type}
                          {order.pre_delete_status && ` • Was: ${order.pre_delete_status}`}
                        </div>
                        {order.deleted_at && (
                          <div className="text-xs text-muted-foreground">
                            Deleted {format(new Date(order.deleted_at as string), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreOrder({
                          id: order.id,
                          order_number: order.order_number,
                          pre_delete_status: (order as any).pre_delete_status || null,
                        })}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Restore Order Dialog */}
      {restoreOrder && (
        <RestoreOrderDialog
          orderId={restoreOrder.id}
          orderNumber={restoreOrder.order_number}
          preDeleteStatus={restoreOrder.pre_delete_status}
          open={!!restoreOrder}
          onOpenChange={(open) => { if (!open) setRestoreOrder(null); }}
          onSuccess={() => { fetchDeletedOrders(); fetchOrders(); }}
        />
      )}

      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? You can restore it later from the Deleted Orders section.
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
      </div>
    </TooltipProvider>
  );
};

export default OrderDashboard;
