import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download,
  Eye,
  Loader2,
  Receipt,
  Plus,
  CalendarDays,
  Bell
} from "lucide-react";
import { toast } from "sonner";
import { isPast, startOfDay } from "date-fns";
import InvoicePreview from "./InvoicePreview";
import InvoiceAnalyticsDashboard from "./InvoiceAnalyticsDashboard";
import InvoiceGenerator from "./InvoiceGenerator";
import ExpenseTracker from "./ExpenseTracker";
import MonthlyBillingSummary from "./MonthlyBillingSummary";
import InvoiceSortControls, { SortField, SortDirection } from "./InvoiceSortControls";

// Helper function to format EGP currency
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

type InvoiceStatus = 'draft' | 'generated' | 'locked' | 'finalized' | 'disputed';

interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | null;
  amount_paid: number;
  due_date: string | null;
  payment_received_at: string | null;
  subtotal: number;
  adjustments_total: number;
  expenses_total: number;
  final_total: number;
  doctor_id?: string | null;
  generated_at: string | null;
  locked_at: string | null;
  finalized_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  order: {
    order_number: string;
    patient_name: string;
    doctor_name: string;
    status: string;
    restoration_type: string;
    delivery_confirmed_at: string | null;
  } | null;
}

const BillingTab = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showExpenseTracker, setShowExpenseTracker] = useState(false);
  const [selectedOrderForExpense, setSelectedOrderForExpense] = useState<string | null>(null);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  
  // Sorting state with localStorage persistence
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = localStorage.getItem('invoice-sort-field');
    return (saved as SortField) || 'created_at';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const saved = localStorage.getItem('invoice-sort-direction');
    return (saved as SortDirection) || 'desc';
  });

  // Persist sort preferences
  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    localStorage.setItem('invoice-sort-field', field);
    localStorage.setItem('invoice-sort-direction', direction);
  };

  // Fetch invoices
  const { data: invoicesRaw, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, searchQuery, role, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          order:orders!inner(
            order_number,
            patient_name,
            doctor_name,
            doctor_id,
            status,
            restoration_type,
            delivery_confirmed_at
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // For doctors, filter to only show their orders' invoices
      if (role === 'doctor' && user?.id) {
        query = query.eq('order.doctor_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search query
      let filtered = (data || []) as Invoice[];
      if (searchQuery) {
        const lowerSearch = searchQuery.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoice_number.toLowerCase().includes(lowerSearch) ||
          inv.order?.order_number?.toLowerCase().includes(lowerSearch) ||
          inv.order?.patient_name?.toLowerCase().includes(lowerSearch)
        );
      }

      return filtered;
    },
    enabled: !!user,
  });

  // Sort invoices client-side
  const invoices = useMemo(() => {
    if (!invoicesRaw) return [];
    
    return [...invoicesRaw].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'final_total':
          comparison = a.final_total - b.final_total;
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'payment_status':
          comparison = (a.payment_status || '').localeCompare(b.payment_status || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [invoicesRaw, sortField, sortDirection]);

  // Fetch pending invoice requests (for lab staff/admin)
  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-invoice-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_requests')
        .select(`
          *,
          order:orders(order_number, patient_name, doctor_name)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && (role === 'admin' || role === 'lab_staff'),
  });

  // Fetch orders eligible for invoice generation (delivered + confirmed)
  const { data: eligibleOrders } = useQuery({
    queryKey: ['eligible-orders-for-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, patient_name, status, delivery_confirmed_at, restoration_type')
        .eq('status', 'Delivered')
        .not('delivery_confirmed_at', 'is', null)
        .order('delivery_confirmed_at', { ascending: false });

      if (error) throw error;

      // Filter out orders that already have invoices
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('order_id');

      const existingOrderIds = new Set((existingInvoices || []).map(i => i.order_id));
      return (data || []).filter(o => !existingOrderIds.has(o.id));
    },
    enabled: !!user && (role === 'admin' || role === 'lab_staff'),
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('generate_invoice_for_order', {
        p_order_id: orderId,
        p_user_id: user?.id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-orders-for-billing'] });
      toast.success('Invoice generated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to generate invoice', { description: error.message });
    }
  });

  // Lock invoice mutation
  const lockInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.rpc('lock_invoice', {
        p_invoice_id: invoiceId,
        p_user_id: user?.id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice locked');
    },
    onError: (error: Error) => {
      toast.error('Failed to lock invoice', { description: error.message });
    }
  });

  // Finalize invoice mutation
  const finalizeInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.rpc('finalize_invoice', {
        p_invoice_id: invoiceId,
        p_user_id: user?.id
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice finalized - it is now immutable');
    },
    onError: (error: Error) => {
      toast.error('Failed to finalize invoice', { description: error.message });
    }
  });

  // Auto-overdue detection mutation
  const updateOverdueMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ payment_status: 'overdue' })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  // Check for overdue invoices on load
  useEffect(() => {
    if (!invoices) return;
    
    invoices.forEach(invoice => {
      if (
        invoice.due_date &&
        isPast(startOfDay(new Date(invoice.due_date))) &&
        (invoice.payment_status === 'pending' || invoice.payment_status === 'partial' || !invoice.payment_status)
      ) {
        updateOverdueMutation.mutate(invoice.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'generated':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><FileText className="h-3 w-3 mr-1" />Generated</Badge>;
      case 'locked':
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Lock className="h-3 w-3 mr-1" />Locked</Badge>;
      case 'finalized':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Finalized</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Disputed</Badge>;
    }
  };

  const statusCounts = {
    all: invoices?.length || 0,
    draft: invoices?.filter(i => i.status === 'draft').length || 0,
    generated: invoices?.filter(i => i.status === 'generated').length || 0,
    locked: invoices?.filter(i => i.status === 'locked').length || 0,
    finalized: invoices?.filter(i => i.status === 'finalized').length || 0,
    disputed: invoices?.filter(i => i.status === 'disputed').length || 0,
  };

  if (selectedInvoice) {
    return (
      <InvoicePreview 
        invoice={selectedInvoice} 
        onClose={() => setSelectedInvoice(null)} 
      />
    );
  }

  if (showExpenseTracker && selectedOrderForExpense) {
    return (
      <ExpenseTracker 
        orderId={selectedOrderForExpense} 
        onClose={() => {
          setShowExpenseTracker(false);
          setSelectedOrderForExpense(null);
        }} 
      />
    );
  }

  if (showInvoiceGenerator) {
    return (
      <InvoiceGenerator 
        onClose={() => setShowInvoiceGenerator(false)}
        onGenerated={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['eligible-orders-for-billing'] });
          setShowInvoiceGenerator(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <InvoiceAnalyticsDashboard invoices={invoices || []} />

      {/* Generate Invoices Button */}
      {(role === 'admin' || role === 'lab_staff') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5" />
                  Invoice Generation
                </CardTitle>
                <CardDescription>
                  Generate invoices for delivered orders with confirmed delivery
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowInvoiceGenerator(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Generate Invoices
                </Button>
                <Button variant="outline" onClick={() => setShowMonthlySummary(true)} className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Monthly Summary
                </Button>
              </div>
            </div>
          </CardHeader>
          {eligibleOrders && eligibleOrders.length > 0 && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{eligibleOrders.length}</span> orders ready for billing
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Pending Invoice Requests (for lab staff/admin) */}
      {(role === 'admin' || role === 'lab_staff') && pendingRequests && pendingRequests.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg text-amber-700 dark:text-amber-400">
                  <Bell className="h-5 w-5" />
                  Invoice Requests
                </CardTitle>
                <CardDescription>
                  Doctors have requested invoices for these orders
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
                {pendingRequests.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.slice(0, 5).map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div>
                    <p className="font-medium text-sm">{request.order?.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.order?.patient_name} • Requested by doctor
                    </p>
                    {request.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{request.notes}"</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      generateInvoiceMutation.mutate(request.order_id);
                    }}
                    disabled={generateInvoiceMutation.isPending}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
          <CardDescription>Manage billing for completed orders</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice or order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')}>
                <TabsList className="w-max sm:w-auto min-w-0 flex-wrap">
                  <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">
                    All ({statusCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="generated" className="text-xs sm:text-sm px-2 sm:px-3">
                    Generated ({statusCounts.generated})
                  </TabsTrigger>
                  <TabsTrigger value="locked" className="text-xs sm:text-sm px-2 sm:px-3">
                    Locked ({statusCounts.locked})
                  </TabsTrigger>
                  <TabsTrigger value="finalized" className="text-xs sm:text-sm px-2 sm:px-3">
                    Finalized ({statusCounts.finalized})
                  </TabsTrigger>
                  {statusCounts.disputed > 0 && (
                    <TabsTrigger value="disputed" className="text-xs sm:text-sm px-2 sm:px-3">
                      Disputed ({statusCounts.disputed})
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>

            {/* Sort Controls */}
            <div className="flex justify-end">
              <InvoiceSortControls
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
              />
            </div>
          </div>

          {/* Invoice Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No invoices found</p>
              <p className="text-sm">Invoices are generated after delivery is confirmed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className="flex flex-col gap-3 p-3 sm:p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-sm sm:text-base truncate">{invoice.invoice_number}</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        Order: {invoice.order?.order_number} • {invoice.order?.patient_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.order?.restoration_type}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-base sm:text-lg">{formatEGP(invoice.final_total)}</p>
                        {invoice.expenses_total > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Expenses: {formatEGP(invoice.expenses_total)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {(role === 'admin' || role === 'lab_staff') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                            onClick={() => {
                              setSelectedOrderForExpense(invoice.order_id);
                              setShowExpenseTracker(true);
                            }}
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        )}

                        {invoice.status === 'generated' && role === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                            onClick={() => lockInvoiceMutation.mutate(invoice.id)}
                            disabled={lockInvoiceMutation.isPending}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}

                        {invoice.status === 'locked' && role === 'admin' && (
                          <Button
                            size="sm"
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                            onClick={() => finalizeInvoiceMutation.mutate(invoice.id)}
                            disabled={finalizeInvoiceMutation.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Finalize</span>
                          </Button>
                        )}

                        {(invoice.status === 'finalized' || invoice.status === 'generated' || invoice.status === 'locked') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Billing Summary Dialog */}
      <MonthlyBillingSummary 
        open={showMonthlySummary} 
        onOpenChange={setShowMonthlySummary} 
      />
    </div>
  );
};

export default BillingTab;
