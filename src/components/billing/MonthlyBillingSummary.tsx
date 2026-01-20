import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, getYear, getMonth } from "date-fns";
import { toast } from "sonner";

// Helper function to format EGP currency
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  payment_status: PaymentStatus | null;
  subtotal: number;
  adjustments_total: number;
  expenses_total: number;
  final_total: number;
  amount_paid: number;
  due_date: string | null;
  generated_at: string | null;
  finalized_at: string | null;
  order: {
    order_number: string;
    patient_name: string;
    restoration_type: string;
    doctor_name: string;
  } | null;
}

interface MonthlyBillingSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MonthlyBillingSummary = ({ open, onOpenChange }: MonthlyBillingSummaryProps) => {
  const { user } = useAuth();
  const currentDate = new Date();
  
  const [selectedYear, setSelectedYear] = useState(getYear(currentDate).toString());
  const [selectedMonth, setSelectedMonth] = useState((getMonth(currentDate) + 1).toString().padStart(2, '0'));

  // Generate last 24 months options
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const date = subMonths(currentDate, i);
      options.push({
        year: getYear(date).toString(),
        month: (getMonth(date) + 1).toString().padStart(2, '0'),
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  const selectedDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // Fetch invoices for selected month
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['monthly-invoices', selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          order:orders(
            order_number,
            patient_name,
            restoration_type,
            doctor_name
          )
        `)
        .gte('generated_at', monthStart.toISOString())
        .lte('generated_at', monthEnd.toISOString())
        .order('generated_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Invoice[];
    },
    enabled: open && !!user,
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!invoices?.length) return null;

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.final_total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    const totalDue = totalRevenue - totalPaid;
    
    const paymentCounts = {
      paid: invoices.filter(inv => inv.payment_status === 'paid').length,
      partial: invoices.filter(inv => inv.payment_status === 'partial').length,
      pending: invoices.filter(inv => inv.payment_status === 'pending' || !inv.payment_status).length,
      overdue: invoices.filter(inv => inv.payment_status === 'overdue').length,
    };

    const statusCounts = {
      finalized: invoices.filter(inv => inv.status === 'finalized').length,
      locked: invoices.filter(inv => inv.status === 'locked').length,
      generated: invoices.filter(inv => inv.status === 'generated').length,
      disputed: invoices.filter(inv => inv.status === 'disputed').length,
    };

    // Group by restoration type
    const revenueByType: Record<string, { count: number; revenue: number }> = {};
    invoices.forEach(inv => {
      const type = inv.order?.restoration_type || 'Unknown';
      if (!revenueByType[type]) {
        revenueByType[type] = { count: 0, revenue: 0 };
      }
      revenueByType[type].count++;
      revenueByType[type].revenue += inv.final_total;
    });

    // Sort by revenue
    const sortedTypes = Object.entries(revenueByType)
      .sort(([, a], [, b]) => b.revenue - a.revenue);

    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    return {
      totalInvoices: invoices.length,
      totalRevenue,
      totalPaid,
      totalDue,
      collectionRate,
      paymentCounts,
      statusCounts,
      revenueByType: sortedTypes,
    };
  }, [invoices]);

  const handleExportPDF = () => {
    if (!invoices?.length || !analytics) {
      toast.error('No data to export');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    const monthLabel = format(selectedDate, "MMMM yyyy");

    // Generate invoice rows HTML
    const invoiceRowsHtml = invoices.map(inv => `
      <tr>
        <td>${inv.invoice_number}</td>
        <td>${inv.order?.patient_name || '-'}</td>
        <td>${inv.order?.restoration_type || '-'}</td>
        <td class="amount">${formatEGP(inv.final_total)}</td>
        <td class="amount">${formatEGP(inv.amount_paid || 0)}</td>
        <td>
          <span class="status-badge status-${inv.payment_status || 'pending'}">
            ${(inv.payment_status || 'pending').toUpperCase()}
          </span>
        </td>
      </tr>
    `).join('');

    // Generate revenue by type rows
    const revenueByTypeHtml = analytics.revenueByType.map(([type, data]) => `
      <tr>
        <td>${type}</td>
        <td class="amount">${data.count}</td>
        <td class="amount">${formatEGP(data.revenue)}</td>
        <td class="amount">${((data.revenue / analytics.totalRevenue) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Billing Summary - ${monthLabel}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 40px; 
              max-width: 1000px; 
              margin: 0 auto; 
              color: #1a1a1a;
              line-height: 1.5;
            }
            .header { 
              text-align: center;
              border-bottom: 3px solid #2563eb; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .header h1 { 
              color: #2563eb; 
              margin: 0 0 5px 0; 
              font-size: 28px;
            }
            .header h2 { 
              color: #666; 
              margin: 0;
              font-size: 20px;
              font-weight: normal;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #f8fafc;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .summary-card .label { 
              font-size: 12px; 
              color: #64748b; 
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .summary-card .value { 
              font-size: 20px; 
              font-weight: bold;
              color: #1a1a1a;
            }
            .summary-card .value.green { color: #16a34a; }
            .summary-card .value.amber { color: #d97706; }
            .summary-card .value.red { color: #dc2626; }
            
            .section { 
              margin-bottom: 25px; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: 600; 
              color: #1a1a1a;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
              font-size: 13px;
            }
            th, td { 
              padding: 10px; 
              text-align: left; 
              border-bottom: 1px solid #e2e8f0; 
            }
            th { 
              background: #f1f5f9; 
              font-weight: 600; 
              font-size: 11px;
              text-transform: uppercase;
              color: #475569;
            }
            .amount { text-align: right; font-family: 'Courier New', monospace; }
            
            .status-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 600;
            }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-partial { background: #fef3c7; color: #92400e; }
            .status-pending { background: #f1f5f9; color: #475569; }
            .status-overdue { background: #fee2e2; color: #991b1b; }
            
            .payment-breakdown {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-top: 15px;
            }
            .payment-item {
              padding: 10px;
              background: #f8fafc;
              border-radius: 6px;
              text-align: center;
            }
            .payment-item .count { font-size: 20px; font-weight: bold; }
            .payment-item .label { font-size: 11px; color: #64748b; }
            
            .progress-bar {
              height: 8px;
              background: #e2e8f0;
              border-radius: 4px;
              overflow: hidden;
              margin-top: 10px;
            }
            .progress-fill {
              height: 100%;
              background: #16a34a;
              border-radius: 4px;
            }
            
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e2e8f0; 
              font-size: 11px; 
              color: #64748b; 
              text-align: center;
            }
            
            @media print { 
              body { padding: 20px; } 
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LABLINK</h1>
            <h2>Monthly Billing Summary - ${monthLabel}</h2>
          </div>
          
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Invoices</div>
              <div class="value">${analytics.totalInvoices}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Revenue</div>
              <div class="value">${formatEGP(analytics.totalRevenue)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Amount Collected</div>
              <div class="value green">${formatEGP(analytics.totalPaid)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Amount Outstanding</div>
              <div class="value ${analytics.totalDue > 0 ? 'amber' : 'green'}">${formatEGP(analytics.totalDue)}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Collection Rate</div>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="flex: 1;">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${analytics.collectionRate}%"></div>
                </div>
              </div>
              <div style="font-size: 20px; font-weight: bold; color: ${analytics.collectionRate >= 80 ? '#16a34a' : analytics.collectionRate >= 50 ? '#d97706' : '#dc2626'}">
                ${analytics.collectionRate.toFixed(1)}%
              </div>
            </div>
            
            <div class="payment-breakdown">
              <div class="payment-item">
                <div class="count" style="color: #16a34a;">${analytics.paymentCounts.paid}</div>
                <div class="label">Paid</div>
              </div>
              <div class="payment-item">
                <div class="count" style="color: #d97706;">${analytics.paymentCounts.partial}</div>
                <div class="label">Partial</div>
              </div>
              <div class="payment-item">
                <div class="count" style="color: #64748b;">${analytics.paymentCounts.pending}</div>
                <div class="label">Pending</div>
              </div>
              <div class="payment-item">
                <div class="count" style="color: #dc2626;">${analytics.paymentCounts.overdue}</div>
                <div class="label">Overdue</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Revenue by Restoration Type</div>
            <table>
              <thead>
                <tr>
                  <th>Restoration Type</th>
                  <th class="amount">Orders</th>
                  <th class="amount">Revenue</th>
                  <th class="amount">Share</th>
                </tr>
              </thead>
              <tbody>
                ${revenueByTypeHtml}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <div class="section-title">Invoice Details</div>
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th class="amount">Total</th>
                  <th class="amount">Paid</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceRowsHtml}
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p><strong>Report Generated:</strong> ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
            <p>This report was automatically generated by LabLink.</p>
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

  const getPaymentBadge = (status: PaymentStatus | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600 text-xs">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500 text-xs">Partial</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monthly Billing Summary
          </DialogTitle>
          <DialogDescription>
            View and export billing summary for a selected month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Month Selector */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Select
              value={`${selectedYear}-${selectedMonth}`}
              onValueChange={(v) => {
                const [year, month] = v.split('-');
                setSelectedYear(year);
                setSelectedMonth(month);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleExportPDF} disabled={!invoices?.length} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !invoices?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No invoices for {format(selectedDate, "MMMM yyyy")}</p>
            </div>
          ) : analytics && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground">Total Invoices</div>
                    <div className="text-2xl font-bold">{analytics.totalInvoices}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Total Revenue
                    </div>
                    <div className="text-2xl font-bold">{formatEGP(analytics.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Collected
                    </div>
                    <div className="text-2xl font-bold text-green-600">{formatEGP(analytics.totalPaid)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-amber-600" />
                      Outstanding
                    </div>
                    <div className={`text-2xl font-bold ${analytics.totalDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatEGP(analytics.totalDue)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Collection Rate */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Progress value={analytics.collectionRate} className="flex-1" />
                    <span className="text-lg font-bold">{analytics.collectionRate.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                      <div className="text-lg font-bold text-green-600">{analytics.paymentCounts.paid}</div>
                      <div className="text-xs text-muted-foreground">Paid</div>
                    </div>
                    <div className="text-center p-2 bg-amber-50 dark:bg-amber-950 rounded">
                      <div className="text-lg font-bold text-amber-600">{analytics.paymentCounts.partial}</div>
                      <div className="text-xs text-muted-foreground">Partial</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="text-lg font-bold">{analytics.paymentCounts.pending}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
                      <div className="text-lg font-bold text-destructive">{analytics.paymentCounts.overdue}</div>
                      <div className="text-xs text-muted-foreground">Overdue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Type */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenue by Restoration Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.revenueByType.slice(0, 5).map(([type, data]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type}</span>
                          <Badge variant="outline" className="text-xs">{data.count} orders</Badge>
                        </div>
                        <span className="font-semibold">{formatEGP(data.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead className="hidden sm:table-cell">Type</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead>Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{inv.order?.patient_name || '-'}</TableCell>
                            <TableCell className="hidden sm:table-cell">{inv.order?.restoration_type || '-'}</TableCell>
                            <TableCell className="text-right font-medium">{formatEGP(inv.final_total)}</TableCell>
                            <TableCell className="text-right">{formatEGP(inv.amount_paid || 0)}</TableCell>
                            <TableCell>{getPaymentBadge(inv.payment_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyBillingSummary;
