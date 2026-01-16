import { useState } from "react";
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
  Receipt
} from "lucide-react";
import { toast } from "sonner";
import InvoicePreview from "./InvoicePreview";
import BillingAnalytics from "./BillingAnalytics";
import ExpenseTracker from "./ExpenseTracker";

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

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
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

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <BillingAnalytics invoices={invoices || []} />

      {/* Eligible Orders for Invoice Generation */}
      {(role === 'admin' || role === 'lab_staff') && eligibleOrders && eligibleOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Ready for Billing
            </CardTitle>
            <CardDescription>
              Orders with confirmed delivery - click to generate invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {eligibleOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <p className="font-mono text-sm font-medium">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.patient_name}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => generateInvoiceMutation.mutate(order.id)}
                    disabled={generateInvoiceMutation.isPending}
                  >
                    {generateInvoiceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Generate'
                    )}
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
                <TabsList className="w-max sm:w-auto">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">All </span>({statusCounts.all})
                  </TabsTrigger>
                  <TabsTrigger value="generated" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Generated </span>({statusCounts.generated})
                  </TabsTrigger>
                  <TabsTrigger value="locked" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Locked </span>({statusCounts.locked})
                  </TabsTrigger>
                  <TabsTrigger value="finalized" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Finalized </span>({statusCounts.finalized})
                  </TabsTrigger>
                  {statusCounts.disputed > 0 && (
                    <TabsTrigger value="disputed" className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">Disputed </span>({statusCounts.disputed})
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
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
    </div>
  );
};

export default BillingTab;
