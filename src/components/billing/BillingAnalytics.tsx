import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Percent
} from "lucide-react";

type InvoiceStatus = 'draft' | 'generated' | 'locked' | 'finalized' | 'disputed';

interface Invoice {
  id: string;
  status: InvoiceStatus;
  subtotal: number;
  adjustments_total: number;
  expenses_total: number;
  final_total: number;
}

interface BillingAnalyticsProps {
  invoices: Invoice[];
}

const BillingAnalytics = ({ invoices }: BillingAnalyticsProps) => {
  const { role } = useUserRole();

  // Calculate metrics
  const finalizedInvoices = invoices.filter(i => i.status === 'finalized');
  const pendingInvoices = invoices.filter(i => i.status !== 'finalized' && i.status !== 'disputed');
  const disputedInvoices = invoices.filter(i => i.status === 'disputed');

  const revenueProcessed = finalizedInvoices.reduce((sum, i) => sum + i.final_total, 0);
  const pendingValue = pendingInvoices.reduce((sum, i) => sum + i.final_total, 0);
  const blockedValue = disputedInvoices.reduce((sum, i) => sum + i.final_total, 0);
  const totalExpenses = invoices.reduce((sum, i) => sum + i.expenses_total, 0);
  const totalAdjustments = invoices.reduce((sum, i) => sum + i.adjustments_total, 0);

  // Calculate margins
  const totalSubtotal = invoices.reduce((sum, i) => sum + i.subtotal, 0);
  const avgMargin = totalSubtotal > 0 
    ? ((totalSubtotal - totalExpenses) / totalSubtotal * 100).toFixed(1)
    : '0';

  // Rework cost estimation (negative adjustments as rework indicator)
  const reworkCosts = invoices.reduce((sum, i) => 
    sum + (i.adjustments_total < 0 ? Math.abs(i.adjustments_total) : 0), 0
  );
  const reworkPercentage = revenueProcessed > 0 
    ? ((reworkCosts / revenueProcessed) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Revenue Processed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue Processed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            ${revenueProcessed.toFixed(0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {finalizedInvoices.length} finalized invoices
          </p>
        </CardContent>
      </Card>

      {/* Pending Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${pendingValue.toFixed(0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingInvoices.length} pending invoices
          </p>
        </CardContent>
      </Card>

      {/* Blocked/Disputed */}
      {(role === 'admin' || disputedInvoices.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked (Disputed)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${blockedValue.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {disputedInvoices.length} disputed invoices
            </p>
          </CardContent>
        </Card>
      )}

      {/* Average Invoice (for all) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Invoice</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${invoices.length > 0 
              ? (invoices.reduce((sum, i) => sum + i.final_total, 0) / invoices.length).toFixed(0)
              : '0'
            }
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Per order average
          </p>
        </CardContent>
      </Card>

      {/* Lab/Admin Only Metrics */}
      {(role === 'admin' || role === 'lab_staff') && (
        <>
          {/* Margin */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMargin}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                After expenses
              </p>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                -${totalExpenses.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Logistics costs
              </p>
            </CardContent>
          </Card>

          {/* Rework % */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rework Cost %</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                parseFloat(reworkPercentage) > 5 ? 'text-destructive' : 'text-green-600'
              }`}>
                {reworkPercentage}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: &lt;5%
              </p>
            </CardContent>
          </Card>

          {/* Total Adjustments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                totalAdjustments >= 0 ? 'text-green-600' : 'text-destructive'
              }`}>
                {totalAdjustments >= 0 ? '+' : ''}${totalAdjustments.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Net adjustments
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default BillingAnalytics;