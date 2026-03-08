import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Clock, Star, DollarSign,
  Package, Building2, Users, CheckCircle2, Target, Download,
} from "lucide-react";
import { formatEGP } from "@/lib/formatters";

export const AnalyticsTabContent = () => {
  const { user } = useAuth();
  const { role, labId, isDoctor, isLabStaff } = useUserRole();

  const { data: doctorStats, isLoading: doctorLoading } = useQuery({
    queryKey: ["doctor-analytics", user?.id],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`id, status, restoration_type, urgency, created_at, actual_delivery_date, desired_delivery_date, assigned_lab:labs(id, name), invoices(final_total, amount_paid, status)`)
        .eq("doctor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const totalOrders = orders?.length ?? 0;
      const completedOrders = orders?.filter((o) => o.status === "Delivered") ?? [];
      const cancelledOrders = orders?.filter((o) => o.status === "Cancelled") ?? [];

      let totalSpent = 0, totalPaid = 0;
      orders?.forEach((o) => { const inv = o.invoices as any; if (inv) { totalSpent += inv.final_total || 0; totalPaid += inv.amount_paid || 0; } });

      const turnaroundDays: number[] = [];
      completedOrders.forEach((o) => {
        if (o.actual_delivery_date && o.created_at) {
          const diff = (new Date(o.actual_delivery_date).getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (diff > 0) turnaroundDays.push(diff);
        }
      });
      const avgTurnaround = turnaroundDays.length > 0 ? turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length : 0;

      const labCounts: Record<string, { name: string; count: number }> = {};
      orders?.forEach((o) => { const lab = o.assigned_lab as any; if (lab?.id) { if (!labCounts[lab.id]) labCounts[lab.id] = { name: lab.name, count: 0 }; labCounts[lab.id].count++; } });
      const favoriteLabs = Object.values(labCounts).sort((a, b) => b.count - a.count).slice(0, 5);

      const typeCounts: Record<string, number> = {};
      orders?.forEach((o) => { const t = o.restoration_type || "Unknown"; typeCounts[t] = (typeCounts[t] || 0) + 1; });
      const typeBreakdown = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

      return { totalOrders, completedCount: completedOrders.length, cancelledCount: cancelledOrders.length, totalSpent, totalPaid, avgTurnaround: Math.round(avgTurnaround * 10) / 10, favoriteLabs, typeBreakdown };
    },
    enabled: !!user?.id && isDoctor,
    staleTime: 60_000,
  });

  const { data: labStats, isLoading: labLoading } = useQuery({
    queryKey: ["lab-analytics", labId],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`id, status, restoration_type, urgency, created_at, actual_delivery_date, desired_delivery_date, expected_delivery_date, doctor_name, doctor_id, invoices(final_total, amount_paid, status)`)
        .eq("assigned_lab_id", labId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const totalOrders = orders?.length ?? 0;
      const completedOrders = orders?.filter((o) => o.status === "Delivered") ?? [];
      const inProgressOrders = orders?.filter((o) => o.status === "In Progress") ?? [];

      let totalRevenue = 0, totalReceived = 0;
      orders?.forEach((o) => { const inv = o.invoices as any; if (inv) { totalRevenue += inv.final_total || 0; totalReceived += inv.amount_paid || 0; } });

      let onTimeCount = 0;
      completedOrders.forEach((o) => {
        const deadline = o.desired_delivery_date || o.expected_delivery_date;
        if (deadline && o.actual_delivery_date) { if (new Date(o.actual_delivery_date) <= new Date(deadline)) onTimeCount++; }
      });
      const onTimeRate = completedOrders.length > 0 ? Math.round((onTimeCount / completedOrders.length) * 100) : 0;

      const clientCounts: Record<string, { name: string; count: number }> = {};
      orders?.forEach((o) => { if (o.doctor_id) { if (!clientCounts[o.doctor_id]) clientCounts[o.doctor_id] = { name: o.doctor_name || "Unknown", count: 0 }; clientCounts[o.doctor_id].count++; } });
      const topClients = Object.values(clientCounts).sort((a, b) => b.count - a.count).slice(0, 5);

      const monthlyRevenue: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        let rev = 0;
        orders?.forEach((o) => { if (o.created_at?.slice(0, 7) === monthKey) { const inv = o.invoices as any; if (inv) rev += inv.final_total || 0; } });
        monthlyRevenue.push({ month: label, revenue: rev });
      }

      return { totalOrders, completedCount: completedOrders.length, inProgressCount: inProgressOrders.length, totalRevenue, totalReceived, onTimeRate, topClients, monthlyRevenue };
    },
    enabled: !!labId && isLabStaff,
    staleTime: 60_000,
  });

  const isLoadingData = isDoctor ? doctorLoading : labLoading;

  if (isLoadingData) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-28" /></Card>)}
      </div>
    );
  }

  if (isDoctor && doctorStats) return <DoctorAnalyticsView stats={doctorStats} />;
  if (isLabStaff && labStats) return <LabAnalyticsView stats={labStats} />;

  return (
    <Card><CardContent className="py-12 text-center"><BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" /><p className="text-muted-foreground">No analytics data available yet.</p></CardContent></Card>
  );
};

// --- Shared Stat Card ---
const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
      </div>
    </CardContent>
  </Card>
);

// --- Doctor View ---
interface DoctorStatsData { totalOrders: number; completedCount: number; cancelledCount: number; totalSpent: number; totalPaid: number; avgTurnaround: number; favoriteLabs: { name: string; count: number }[]; typeBreakdown: [string, number][]; }

const DoctorAnalyticsView = ({ stats }: { stats: DoctorStatsData }) => {
  const handleExport = async () => {
    const { exportToCSV } = await import("@/lib/exportUtils");
    const rows = [
      { Metric: "Total Orders", Value: String(stats.totalOrders) }, { Metric: "Delivered", Value: String(stats.completedCount) },
      { Metric: "Cancelled", Value: String(stats.cancelledCount) }, { Metric: "Total Spent (EGP)", Value: String(stats.totalSpent) },
      { Metric: "Total Paid (EGP)", Value: String(stats.totalPaid) }, { Metric: "Avg Turnaround (days)", Value: String(stats.avgTurnaround) },
      ...stats.favoriteLabs.map((l) => ({ Metric: `Lab: ${l.name}`, Value: `${l.count} orders` })),
      ...stats.typeBreakdown.map(([t, c]) => ({ Metric: `Type: ${t}`, Value: String(c) })),
    ];
    exportToCSV(rows, `doctor-analytics-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Total Orders" value={String(stats.totalOrders)} sub={`${stats.completedCount} delivered`} />
        <StatCard icon={DollarSign} label="Total Spent" value={formatEGP(stats.totalSpent)} sub={`${formatEGP(stats.totalPaid)} paid`} />
        <StatCard icon={Clock} label="Avg Turnaround" value={`${stats.avgTurnaround} days`} sub="creation to delivery" />
        <StatCard icon={CheckCircle2} label="Completion Rate" value={stats.totalOrders > 0 ? `${Math.round((stats.completedCount / stats.totalOrders) * 100)}%` : "—"} sub={`${stats.cancelledCount} cancelled`} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Most Used Labs</CardTitle></CardHeader>
          <CardContent>
            {stats.favoriteLabs.length === 0 ? <p className="text-sm text-muted-foreground">No lab data yet</p> : (
              <div className="space-y-3">
                {stats.favoriteLabs.map((lab, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="text-sm font-medium text-muted-foreground w-5">{i + 1}.</span><span className="text-sm font-medium">{lab.name}</span></div>
                    <Badge variant="secondary">{lab.count} orders</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Restoration Types</CardTitle></CardHeader>
          <CardContent>
            {stats.typeBreakdown.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet</p> : (
              <div className="space-y-3">
                {stats.typeBreakdown.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / stats.totalOrders) * 100}%` }} /></div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// --- Lab View ---
interface LabStatsData { totalOrders: number; completedCount: number; inProgressCount: number; totalRevenue: number; totalReceived: number; onTimeRate: number; topClients: { name: string; count: number }[]; monthlyRevenue: { month: string; revenue: number }[]; }

const LabAnalyticsView = ({ stats }: { stats: LabStatsData }) => {
  const handleExport = async () => {
    const { exportToCSV } = await import("@/lib/exportUtils");
    const rows = [
      { Metric: "Total Orders", Value: String(stats.totalOrders) }, { Metric: "Completed", Value: String(stats.completedCount) },
      { Metric: "In Progress", Value: String(stats.inProgressCount) }, { Metric: "Total Revenue (EGP)", Value: String(stats.totalRevenue) },
      { Metric: "Received (EGP)", Value: String(stats.totalReceived) }, { Metric: "On-Time Rate", Value: `${stats.onTimeRate}%` },
      ...stats.monthlyRevenue.map((m) => ({ Metric: `Revenue ${m.month}`, Value: String(m.revenue) })),
      ...stats.topClients.map((c) => ({ Metric: `Client: ${c.name}`, Value: `${c.count} orders` })),
    ];
    exportToCSV(rows, `lab-analytics-${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Total Orders" value={String(stats.totalOrders)} sub={`${stats.inProgressCount} in progress`} />
        <StatCard icon={DollarSign} label="Total Revenue" value={formatEGP(stats.totalRevenue)} sub={`${formatEGP(stats.totalReceived)} received`} />
        <StatCard icon={TrendingUp} label="On-Time Rate" value={`${stats.onTimeRate}%`} sub={`${stats.completedCount} completed`} />
        <StatCard icon={Star} label="Completion Rate" value={stats.totalOrders > 0 ? `${Math.round((stats.completedCount / stats.totalOrders) * 100)}%` : "—"} sub="of all orders" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Revenue Trend (6 months)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.monthlyRevenue.map((m) => {
                const maxRev = Math.max(...stats.monthlyRevenue.map((r) => r.revenue), 1);
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-14">{m.month}</span>
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden"><div className="h-full rounded bg-primary/80 transition-all" style={{ width: `${(m.revenue / maxRev) * 100}%` }} /></div>
                    <span className="text-xs font-mono w-20 text-right">{formatEGP(m.revenue)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Top Clients</CardTitle></CardHeader>
          <CardContent>
            {stats.topClients.length === 0 ? <p className="text-sm text-muted-foreground">No client data yet</p> : (
              <div className="space-y-3">
                {stats.topClients.map((client, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="text-sm font-medium text-muted-foreground w-5">{i + 1}.</span><span className="text-sm font-medium">{client.name}</span></div>
                    <Badge variant="secondary">{client.count} orders</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
