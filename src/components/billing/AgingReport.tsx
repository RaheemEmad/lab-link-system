import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, AlertTriangle, Clock } from "lucide-react";
import { differenceInDays, startOfDay } from "date-fns";
import { formatEGP } from "@/lib/formatters";

interface Invoice {
  id: string;
  invoice_number: string;
  final_total: number;
  amount_paid: number;
  due_date: string | null;
  payment_status: string | null;
  order?: {
    order_number?: string;
    patient_name?: string;
    doctor_name?: string;
  } | null;
}

interface AgingReportProps {
  invoices: Invoice[];
  onClose: () => void;
}

type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

const BUCKET_LABELS: Record<AgingBucket, string> = {
  '0-30': '0–30 Days',
  '31-60': '31–60 Days',
  '61-90': '61–90 Days',
  '90+': '90+ Days',
};

const BUCKET_COLORS: Record<AgingBucket, string> = {
  '0-30': 'bg-amber-500/10 text-amber-700',
  '31-60': 'bg-orange-500/10 text-orange-700',
  '61-90': 'bg-red-500/10 text-red-700',
  '90+': 'bg-destructive/10 text-destructive',
};

const AgingReport = ({ invoices, onClose }: AgingReportProps) => {
  const agingData = useMemo(() => {
    const today = startOfDay(new Date());
    const buckets: Record<AgingBucket, Invoice[]> = {
      '0-30': [],
      '31-60': [],
      '61-90': [],
      '90+': [],
    };

    const overdueInvoices = invoices.filter(
      inv => inv.due_date && inv.payment_status !== 'paid' && (inv.final_total - (inv.amount_paid || 0)) > 0
    );

    overdueInvoices.forEach(inv => {
      const dueDate = startOfDay(new Date(inv.due_date!));
      const daysOverdue = differenceInDays(today, dueDate);

      if (daysOverdue <= 0) return; // Not yet overdue
      if (daysOverdue <= 30) buckets['0-30'].push(inv);
      else if (daysOverdue <= 60) buckets['31-60'].push(inv);
      else if (daysOverdue <= 90) buckets['61-90'].push(inv);
      else buckets['90+'].push(inv);
    });

    const bucketTotals = Object.entries(buckets).map(([key, items]) => ({
      bucket: key as AgingBucket,
      count: items.length,
      total: items.reduce((sum, inv) => sum + (inv.final_total - (inv.amount_paid || 0)), 0),
      invoices: items,
    }));

    const grandTotal = bucketTotals.reduce((sum, b) => sum + b.total, 0);
    const totalCount = bucketTotals.reduce((sum, b) => sum + b.count, 0);

    return { bucketTotals, grandTotal, totalCount };
  }, [invoices]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Aging Report
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {agingData.bucketTotals.map(({ bucket, count, total }) => (
          <Card key={bucket}>
            <CardContent className="pt-4 pb-3">
              <div className={`rounded-lg p-3 ${BUCKET_COLORS[bucket]}`}>
                <p className="text-xs font-medium">{BUCKET_LABELS[bucket]}</p>
                <p className="text-xl font-bold mt-1">{formatEGP(total)}</p>
                <p className="text-xs mt-1">{count} invoice{count !== 1 ? 's' : ''}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grand Total */}
      <Card className="border-destructive/30">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Overdue</p>
              <p className="text-2xl font-bold text-destructive">{formatEGP(agingData.grandTotal)}</p>
            </div>
            <Badge variant="destructive" className="text-sm">
              {agingData.totalCount} overdue
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detail Table */}
      {agingData.bucketTotals.map(({ bucket, invoices: bucketInvoices }) => {
        if (bucketInvoices.length === 0) return null;
        return (
          <Card key={bucket}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {BUCKET_LABELS[bucket]} ({bucketInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bucketInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.order?.patient_name || '-'}</TableCell>
                      <TableCell>{inv.order?.doctor_name || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatEGP(inv.final_total - (inv.amount_paid || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {agingData.totalCount === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No overdue invoices</p>
          <p className="text-sm">All invoices are current</p>
        </div>
      )}
    </div>
  );
};

export default AgingReport;
