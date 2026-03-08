import { useMemo } from "react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { countTeeth } from "@/lib/formatters";

interface InvoiceForAnalytics {
  id: string;
  status: string;
  final_total: number;
  amount_paid?: number | null;
  created_at: string;
  order?: {
    restoration_type?: string;
    teeth_number?: string;
  } | null;
}

export interface InvoiceAnalytics {
  totalRevenue: number;
  thisMonthRevenue: number;
  totalPaid: number;
  totalDue: number;
  thisMonthDue: number;
  finalizedCount: number;
  pendingCount: number;
  disputedCount: number;
  totalCrowns: number;
  sortedTypes: [string, { count: number; revenue: number }][];
  paymentRate: number;
  invoiceCount: number;
}

/**
 * Shared hook to compute invoice analytics from an invoice array.
 * Used by InvoiceAnalyticsDashboard and MonthlyBillingSummary.
 */
export function useInvoiceAnalytics(invoices: InvoiceForAnalytics[]): InvoiceAnalytics {
  return useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    const thisMonthInvoices = invoices.filter((inv) =>
      isWithinInterval(parseISO(inv.created_at), {
        start: thisMonthStart,
        end: thisMonthEnd,
      })
    );

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.final_total, 0);
    const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + inv.final_total, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    const totalDue = totalRevenue - totalPaid;

    const thisMonthDue = thisMonthInvoices.reduce((sum, inv) => {
      return sum + (inv.final_total - (inv.amount_paid || 0));
    }, 0);

    const finalizedCount = invoices.filter((i) => i.status === "finalized").length;
    const pendingCount = invoices.filter(
      (i) => i.status === "generated" || i.status === "locked"
    ).length;
    const disputedCount = invoices.filter((i) => i.status === "disputed").length;

    const totalCrowns = invoices.reduce(
      (sum, inv) => sum + countTeeth(inv.order?.teeth_number || ""),
      0
    );

    // Group by restoration type (single pass)
    const byType: Record<string, { count: number; revenue: number }> = {};
    invoices.forEach((inv) => {
      const type = inv.order?.restoration_type || "Unknown";
      if (!byType[type]) {
        byType[type] = { count: 0, revenue: 0 };
      }
      byType[type].count++;
      byType[type].revenue += inv.final_total;
    });

    const sortedTypes = Object.entries(byType)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5) as [string, { count: number; revenue: number }][];

    const paymentRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      thisMonthRevenue,
      totalPaid,
      totalDue,
      thisMonthDue,
      finalizedCount,
      pendingCount,
      disputedCount,
      totalCrowns,
      sortedTypes,
      paymentRate,
      invoiceCount: invoices.length,
    };
  }, [invoices]);
}
