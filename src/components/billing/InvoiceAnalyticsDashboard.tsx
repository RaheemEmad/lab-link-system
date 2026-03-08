import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

import { formatEGP } from "@/lib/formatters";
import { useInvoiceAnalytics } from "@/hooks/useInvoiceAnalytics";

interface Invoice {
  id: string;
  order_id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  final_total: number;
  payment_status?: string | null;
  amount_paid?: number | null;
  created_at: string;
  order?: {
    restoration_type: string;
    teeth_number?: string;
    doctor_name?: string;
    patient_name?: string;
    order_number?: string;
    status?: string;
    delivery_confirmed_at?: string | null;
  } | null;
}

interface InvoiceAnalyticsDashboardProps {
  invoices: Invoice[];
}

const InvoiceAnalyticsDashboard = ({ invoices }: InvoiceAnalyticsDashboardProps) => {
  const analytics = useInvoiceAnalytics(invoices);

  return (
    <div className="space-y-4">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg sm:text-xl font-bold">{formatEGP(analytics.totalRevenue)}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg sm:text-xl font-bold">{formatEGP(analytics.thisMonthRevenue)}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600">{formatEGP(analytics.totalDue)}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Month Due</p>
                <p className="text-lg sm:text-xl font-bold text-red-600">{formatEGP(analytics.thisMonthDue)}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Collected (Net of Credits)</span>
                <span className="font-semibold">{formatEGP(analytics.totalPaid)}</span>
              </div>
              <Progress value={analytics.paymentRate} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{analytics.paymentRate.toFixed(1)}% collected</span>
                <span>{formatEGP(analytics.totalDue)} pending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Invoice Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{analytics.finalizedCount}</p>
                <p className="text-xs text-muted-foreground">Finalized</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{analytics.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{analytics.disputedCount}</p>
                <p className="text-xs text-muted-foreground">Disputed</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <p className="text-2xl font-bold">{analytics.totalCrowns}</p>
                <p className="text-xs text-muted-foreground">Crowns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Type */}
      {analytics.sortedTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue by Restoration Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.sortedTypes.map(([type, data]) => {
                const percentage = (data.revenue / analytics.totalRevenue) * 100;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{type}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          {data.count} orders
                        </Badge>
                        <span className="font-semibold text-right min-w-[100px]">
                          {formatEGP(data.revenue)}
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceAnalyticsDashboard;
