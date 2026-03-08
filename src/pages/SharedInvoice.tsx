import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { formatEGP } from "@/lib/formatters";

const SharedInvoice = () => {
  const { token } = useParams<{ token: string }>();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["shared-invoice", token],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/invoice-share?token=${token}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Invoice not found");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              {(error as Error)?.message || "This invoice link may be invalid or expired."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remaining = invoice.final_total - (invoice.amount_paid || 0);

  return (
    <div className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">LABLINK</h1>
          <p className="text-muted-foreground text-sm">Invoice</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {invoice.invoice_number}
              </CardTitle>
              <Badge className={
                invoice.payment_status === 'paid' ? 'bg-green-600' :
                invoice.payment_status === 'overdue' ? 'bg-destructive' :
                invoice.payment_status === 'partial' ? 'bg-amber-500' : ''
              }>
                {(invoice.payment_status || 'pending').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-medium">{invoice.order?.patient_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Restoration</p>
                <p className="font-medium">{invoice.order?.restoration_type || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Doctor</p>
                <p className="font-medium">{invoice.order?.doctor_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {invoice.created_at ? format(new Date(invoice.created_at), "MMM d, yyyy") : '-'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            {invoice.line_items?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Line Items</p>
                {invoice.line_items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.description} (×{item.quantity})</span>
                    <span className="font-mono">{formatEGP(item.total_price)}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatEGP(invoice.subtotal)}</span>
              </div>
              {invoice.adjustments_total !== 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Adjustments</span>
                  <span>{formatEGP(invoice.adjustments_total)}</span>
                </div>
              )}
              {invoice.late_fee_applied > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Late Fee</span>
                  <span>+{formatEGP(invoice.late_fee_applied)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatEGP(invoice.final_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="text-green-600 font-semibold">{formatEGP(invoice.amount_paid || 0)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="text-destructive font-semibold">{formatEGP(remaining)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Generated by LabLink • This is a read-only view
        </p>
      </div>
    </div>
  );
};

export default SharedInvoice;
