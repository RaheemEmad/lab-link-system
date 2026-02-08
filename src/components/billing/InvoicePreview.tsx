import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Download, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Clock,
  Loader2,
  Plus,
  CreditCard,
  Calendar,
  Gavel
} from "lucide-react";
import { formatDistanceToNow, format, isPast, startOfDay } from "date-fns";
import InvoiceLineItems from "./InvoiceLineItems";
import AdjustmentDialog from "./AdjustmentDialog";
import DisputeDialog from "./DisputeDialog";
import PaymentDialog from "./PaymentDialog";
import DisputeResolutionDialog from "./DisputeResolutionDialog";
import { useState } from "react";
import { toast } from "sonner";

// Helper function to format EGP currency
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

type InvoiceStatus = 'draft' | 'generated' | 'locked' | 'finalized' | 'disputed';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus | null;
  amount_paid: number;
  due_date: string | null;
  payment_received_at: string | null;
  subtotal: number;
  adjustments_total: number;
  expenses_total: number;
  final_total: number;
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

interface InvoicePreviewProps {
  invoice: Invoice;
  onClose: () => void;
}

const InvoicePreview = ({ invoice, onClose }: InvoicePreviewProps) => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);

  // Fetch full order details for PDF
  const { data: orderDetails } = useQuery({
    queryKey: ['order-details-for-invoice', invoice.order_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_lab:labs(name, address, contact_email, contact_phone)
        `)
        .eq('id', invoice.order_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch adjustments
  const { data: adjustments } = useQuery({
    queryKey: ['invoice-adjustments', invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_adjustments')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses } = useQuery({
    queryKey: ['invoice-expenses', invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_expenses')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch line items for PDF
  const { data: lineItems } = useQuery({
    queryKey: ['invoice-line-items', invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['invoice-audit-log', invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_audit_log')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Lock invoice mutation
  const lockMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('lock_invoice', {
        p_invoice_id: invoice.id,
        p_user_id: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice locked');
      onClose();
    },
    onError: (error: Error) => {
      toast.error('Failed to lock invoice', { description: error.message });
    }
  });

  // Finalize invoice mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('finalize_invoice', {
        p_invoice_id: invoice.id,
        p_user_id: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice finalized - it is now immutable');
      onClose();
    },
    onError: (error: Error) => {
      toast.error('Failed to finalize invoice', { description: error.message });
    }
  });

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    const order = orderDetails;
    const lab = order?.assigned_lab;

    // Generate line items HTML
    const lineItemsHtml = lineItems?.map(item => `
      <tr>
        <td>${item.description}</td>
        <td class="amount">${item.quantity}</td>
        <td class="amount">${formatEGP(item.unit_price)}</td>
        <td class="amount">${formatEGP(item.total_price)}</td>
      </tr>
    `).join('') || '';

    // Generate adjustments HTML
    const adjustmentsHtml = adjustments?.map(adj => `
      <tr>
        <td>Adjustment: ${adj.adjustment_type} - ${adj.reason}</td>
        <td class="amount">-</td>
        <td class="amount">-</td>
        <td class="amount ${adj.amount >= 0 ? 'positive' : 'negative'}">${adj.amount >= 0 ? '+' : ''}${formatEGP(adj.amount)}</td>
      </tr>
    `).join('') || '';

    // Generate expenses HTML
    const expensesHtml = expenses?.map(exp => `
      <tr class="expense-row">
        <td>Expense: ${exp.expense_type}${exp.description ? ` - ${exp.description}` : ''}</td>
        <td class="amount">-</td>
        <td class="amount">-</td>
        <td class="amount negative">-${formatEGP(exp.amount)}</td>
      </tr>
    `).join('') || '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto; 
              color: #1a1a1a;
              line-height: 1.5;
            }
            .header { 
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .logo-section h1 { 
              color: #2563eb; 
              margin: 0 0 5px 0; 
              font-size: 28px;
            }
            .logo-section p { margin: 0; color: #666; }
            .invoice-info { text-align: right; }
            .invoice-info .invoice-number { 
              font-size: 24px; 
              font-weight: bold; 
              color: #1a1a1a;
            }
            .status { 
              display: inline-block; 
              padding: 6px 16px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: 600; 
              text-transform: uppercase;
              margin-top: 10px;
            }
            .status-finalized { background: #dcfce7; color: #166534; }
            .status-locked { background: #fef3c7; color: #92400e; }
            .status-generated { background: #dbeafe; color: #1e40af; }
            .status-disputed { background: #fee2e2; color: #991b1b; }
            
            .section { 
              margin-bottom: 25px; 
              padding: 20px; 
              background: #f8fafc; 
              border-radius: 8px;
            }
            .section-title { 
              font-size: 14px; 
              font-weight: 600; 
              color: #64748b; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 15px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 15px; 
            }
            .info-item { }
            .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .info-value { font-weight: 600; color: #1a1a1a; }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            th, td { 
              padding: 12px; 
              text-align: left; 
              border-bottom: 1px solid #e2e8f0; 
            }
            th { 
              background: #f1f5f9; 
              font-weight: 600; 
              font-size: 12px;
              text-transform: uppercase;
              color: #475569;
            }
            .amount { text-align: right; font-family: 'Courier New', monospace; }
            .positive { color: #16a34a; }
            .negative { color: #dc2626; }
            .expense-row { background: #fef2f2; }
            
            .totals-section {
              margin-top: 20px;
              padding: 20px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .total-row:last-child { border-bottom: none; }
            .total-row.final { 
              font-size: 20px; 
              font-weight: bold; 
              border-top: 2px solid #2563eb;
              padding-top: 15px;
              margin-top: 10px;
            }
            
            .timeline-section {
              margin: 25px 0;
              padding: 20px;
              background: #f0fdf4;
              border-radius: 8px;
              border-left: 4px solid #22c55e;
            }
            .timeline-item {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 13px;
            }
            .timeline-label { color: #64748b; }
            .timeline-value { font-weight: 500; }
            
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e2e8f0; 
              font-size: 11px; 
              color: #64748b; 
              text-align: center;
            }
            .footer p { margin: 5px 0; }
            
            @media print { 
              body { padding: 20px; } 
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <h1>LABLINK</h1>
              <p>Dental Laboratory Management</p>
            </div>
            <div class="invoice-info">
              <div class="invoice-number">${invoice.invoice_number}</div>
              <div style="color: #666; font-size: 13px;">Invoice Date: ${format(new Date(invoice.created_at), 'MMMM d, yyyy')}</div>
              <span class="status status-${invoice.status}">${invoice.status}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Order Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Order Number</div>
                <div class="info-value">${order?.order_number || '-'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Patient Name</div>
                <div class="info-value">${order?.patient_name || '-'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Doctor</div>
                <div class="info-value">${order?.doctor_name || '-'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Laboratory</div>
                <div class="info-value">${lab?.name || '-'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Restoration Type</div>
                <div class="info-value">${order?.restoration_type || '-'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Teeth</div>
                <div class="info-value">${order?.teeth_number || '-'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Shade</div>
                <div class="info-value">${order?.teeth_shade || '-'}${order?.shade_system ? ` (${order.shade_system})` : ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Urgency</div>
                <div class="info-value">${order?.urgency || '-'}</div>
              </div>
            </div>
            ${order?.handling_instructions ? `
              <div style="margin-top: 15px;">
                <div class="info-label">Special Instructions</div>
                <div class="info-value" style="font-weight: normal;">${order.handling_instructions}</div>
              </div>
            ` : ''}
          </div>

          <div class="timeline-section">
            <div class="section-title" style="border-bottom: none; padding-bottom: 0;">Timeline</div>
            <div class="timeline-item">
              <span class="timeline-label">Order Created</span>
              <span class="timeline-value">${order?.created_at ? format(new Date(order.created_at), 'MMM d, yyyy h:mm a') : '-'}</span>
            </div>
            ${order?.agreed_fee_at ? `
            <div class="timeline-item">
              <span class="timeline-label">Fee Agreed</span>
              <span class="timeline-value">${format(new Date(order.agreed_fee_at), 'MMM d, yyyy h:mm a')} - ${formatEGP(order.agreed_fee || 0)}</span>
            </div>
            ` : ''}
            <div class="timeline-item">
              <span class="timeline-label">Expected Delivery</span>
              <span class="timeline-value">${order?.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'MMM d, yyyy') : '-'}</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">Actual Delivery</span>
              <span class="timeline-value">${order?.actual_delivery_date ? format(new Date(order.actual_delivery_date), 'MMM d, yyyy') : '-'}</span>
            </div>
            ${order?.delivery_confirmed_at ? `
            <div class="timeline-item">
              <span class="timeline-label">Delivery Confirmed</span>
              <span class="timeline-value">${format(new Date(order.delivery_confirmed_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            ` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Qty</th>
                <th class="amount">Unit Price</th>
                <th class="amount">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
              ${adjustmentsHtml}
              ${expensesHtml}
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${formatEGP(invoice.subtotal)}</span>
            </div>
            ${invoice.adjustments_total !== 0 ? `
            <div class="total-row">
              <span>Adjustments</span>
              <span class="${invoice.adjustments_total >= 0 ? 'positive' : 'negative'}">${invoice.adjustments_total >= 0 ? '+' : ''}${formatEGP(invoice.adjustments_total)}</span>
            </div>
            ` : ''}
            ${invoice.expenses_total > 0 ? `
            <div class="total-row">
              <span>Expenses</span>
              <span class="negative">-${formatEGP(invoice.expenses_total)}</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <span>TOTAL</span>
              <span>${formatEGP(invoice.final_total)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Invoice Generated:</strong> ${invoice.generated_at ? format(new Date(invoice.generated_at), 'MMMM d, yyyy h:mm a') : '-'}</p>
            ${invoice.finalized_at ? `<p><strong>Invoice Finalized:</strong> ${format(new Date(invoice.finalized_at), 'MMMM d, yyyy h:mm a')}</p>` : ''}
            <p style="margin-top: 15px;">This invoice was automatically generated by LabLink.</p>
            <p>For questions or disputes, please contact support within 7 days of invoice generation.</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

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

  const getPaymentBadge = (status: PaymentStatus | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500"><CreditCard className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onClose} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <div className="flex flex-wrap gap-2">
          {/* Allow PDF export for generated, locked, and finalized invoices - for all authenticated users */}
          {(invoice.status === 'finalized' || invoice.status === 'locked' || invoice.status === 'generated') && (
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span> PDF
            </Button>
          )}
          {invoice.status !== 'finalized' && invoice.status !== 'disputed' && (role === 'doctor' || role === 'lab_staff') && (
            <Button variant="outline" size="sm" onClick={() => setShowDisputeDialog(true)} className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Dispute</span>
            </Button>
          )}
          {invoice.status === 'disputed' && role === 'admin' && (
            <Button variant="default" size="sm" onClick={() => setShowResolutionDialog(true)} className="gap-1.5">
              <Gavel className="h-4 w-4" />
              <span className="hidden sm:inline">Resolve Dispute</span>
            </Button>
          )}
          {invoice.status === 'generated' && role === 'admin' && (
            <Button variant="outline" size="sm" onClick={() => lockMutation.mutate()} disabled={lockMutation.isPending} className="gap-1.5">
              {lockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              <span className="hidden sm:inline">Lock Invoice</span>
            </Button>
          )}
          {invoice.status === 'locked' && role === 'admin' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowAdjustmentDialog(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Adjustment</span>
              </Button>
              <Button size="sm" onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending} className="gap-1.5">
                {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span className="hidden sm:inline">Finalize</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl sm:text-2xl truncate">{invoice.invoice_number}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                Order: {invoice.order?.order_number} • {invoice.order?.patient_name}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {getStatusBadge(invoice.status)}
              {getPaymentBadge(invoice.payment_status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Doctor</p>
              <p className="font-medium text-sm sm:text-base truncate">{invoice.order?.doctor_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Restoration Type</p>
              <p className="font-medium text-sm sm:text-base truncate">{invoice.order?.restoration_type || '-'}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Generated</p>
              <p className="font-medium text-sm sm:text-base">
                {invoice.generated_at 
                  ? formatDistanceToNow(new Date(invoice.generated_at), { addSuffix: true })
                  : '-'
                }
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Order Status</p>
              <p className="font-medium text-sm sm:text-base">{invoice.order?.status || '-'}</p>
            </div>
          </div>

          {invoice.status === 'disputed' && invoice.dispute_reason && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                <AlertTriangle className="h-4 w-4" />
                Dispute Reason
              </div>
              <p className="text-sm">{invoice.dispute_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </CardTitle>
            {(role === 'admin' || role === 'lab_staff') && (
              <Button variant="outline" size="sm" onClick={() => setShowPaymentDialog(true)} className="gap-1.5">
                <CreditCard className="h-4 w-4" />
                Update Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Due</p>
              <p className="font-semibold text-lg">{formatEGP(invoice.final_total)}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Amount Paid</p>
              <p className="font-semibold text-lg text-green-600">{formatEGP(invoice.amount_paid || 0)}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Remaining</p>
              <p className={`font-semibold text-lg ${(invoice.final_total - (invoice.amount_paid || 0)) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatEGP(Math.max(0, invoice.final_total - (invoice.amount_paid || 0)))}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </p>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm sm:text-base">
                  {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'Not set'}
                </p>
                {invoice.due_date && isPast(startOfDay(new Date(invoice.due_date))) && invoice.payment_status !== 'paid' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {invoice.payment_received_at && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Payment received on {format(new Date(invoice.payment_received_at), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <InvoiceLineItems invoiceId={invoice.id} />

      {/* Adjustments */}
      {adjustments && adjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adjustments.map((adj) => (
                <div key={adj.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <Badge variant="outline" className="mb-1">{adj.adjustment_type}</Badge>
                    <p className="text-sm">{adj.reason}</p>
                  </div>
                  <p className={`font-semibold ${adj.amount >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {adj.amount >= 0 ? '+' : ''}{formatEGP(adj.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses */}
      {expenses && expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logistics Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <Badge variant="outline" className="mb-1">{exp.expense_type}</Badge>
                    <p className="text-sm">{exp.description || 'No description'}</p>
                  </div>
                  <p className="font-semibold text-destructive">-{formatEGP(exp.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatEGP(invoice.subtotal)}</span>
            </div>
            {invoice.adjustments_total !== 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Adjustments</span>
                <span className={invoice.adjustments_total >= 0 ? 'text-green-600' : 'text-destructive'}>
                  {invoice.adjustments_total >= 0 ? '+' : ''}{formatEGP(invoice.adjustments_total)}
                </span>
              </div>
            )}
            {invoice.expenses_total > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Expenses</span>
                <span className="text-destructive">-{formatEGP(invoice.expenses_total)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatEGP(invoice.final_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      {role === 'admin' && auditLog && auditLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLog.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 text-sm border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    {log.reason && <span className="text-muted-foreground">{log.reason}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AdjustmentDialog
        open={showAdjustmentDialog}
        onOpenChange={setShowAdjustmentDialog}
        invoiceId={invoice.id}
      />

      <DisputeDialog
        open={showDisputeDialog}
        onOpenChange={setShowDisputeDialog}
        invoiceId={invoice.id}
        onSuccess={onClose}
      />

      <DisputeResolutionDialog
        open={showResolutionDialog}
        onOpenChange={setShowResolutionDialog}
        invoiceId={invoice.id}
        disputeReason={invoice.dispute_reason}
        onSuccess={onClose}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        invoiceId={invoice.id}
        currentStatus={invoice.payment_status}
        currentAmountPaid={invoice.amount_paid || 0}
        currentDueDate={invoice.due_date}
        currentPaymentReceivedAt={invoice.payment_received_at}
        finalTotal={invoice.final_total}
      />
    </div>
  );
};

export default InvoicePreview;
