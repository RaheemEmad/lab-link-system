import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, getYear, getMonth } from "date-fns";
import { toast } from "sonner";
import { formatEGP } from "@/lib/formatters";

interface StatementGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StatementGenerator = ({ open, onOpenChange }: StatementGeneratorProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentDate = new Date();

  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    `${getYear(currentDate)}-${(getMonth(currentDate) + 1).toString().padStart(2, '0')}`
  );

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(currentDate, i);
      options.push({
        value: `${getYear(date)}-${(getMonth(date) + 1).toString().padStart(2, '0')}`,
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  // Fetch unique doctors from finalized invoices
  const { data: doctors } = useQuery({
    queryKey: ["statement-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("order:orders!inner(doctor_id, doctor_name)")
        .eq("status", "finalized");
      if (error) throw error;

      const uniqueDocs = new Map<string, string>();
      (data || []).forEach((inv: any) => {
        if (inv.order?.doctor_id && inv.order?.doctor_name) {
          uniqueDocs.set(inv.order.doctor_id, inv.order.doctor_name);
        }
      });
      return Array.from(uniqueDocs.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: open && !!user,
  });

  const [year, month] = selectedMonth.split("-").map(Number);
  const periodStart = startOfMonth(new Date(year, month - 1));
  const periodEnd = endOfMonth(new Date(year, month - 1));

  // Preview invoices for selection
  const { data: previewInvoices, isLoading } = useQuery({
    queryKey: ["statement-preview", selectedDoctorId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, final_total, amount_paid, payment_status, order:orders!inner(doctor_id, patient_name, restoration_type)")
        .eq("status", "finalized")
        .eq("order.doctor_id", selectedDoctorId)
        .gte("finalized_at", periodStart.toISOString())
        .lte("finalized_at", periodEnd.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!selectedDoctorId && !!selectedMonth,
  });

  const totalAmount = previewInvoices?.reduce((sum, inv) => sum + inv.final_total, 0) || 0;
  const totalPaid = previewInvoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!previewInvoices?.length) throw new Error("No invoices for this period");

      // Get the lab_id from user_roles
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("lab_id")
        .eq("user_id", user?.id!)
        .eq("role", "lab_staff")
        .single();

      const labId = userRole?.lab_id;
      if (!labId) throw new Error("Lab not found");

      const { error } = await supabase.from("billing_statements").insert({
        doctor_id: selectedDoctorId,
        lab_id: labId,
        period_start: format(periodStart, "yyyy-MM-dd"),
        period_end: format(periodEnd, "yyyy-MM-dd"),
        invoice_ids: previewInvoices.map(inv => inv.id),
        total: totalAmount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-statements"] });
      toast.success("Statement generated");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to generate statement", { description: err.message });
    },
  });

  // Export statement as printable page
  const handleExport = () => {
    if (!previewInvoices?.length) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Allow popups to export"); return; }

    const doctor = doctors?.find(d => d.id === selectedDoctorId);
    const rows = previewInvoices.map(inv => `
      <tr>
        <td>${inv.invoice_number}</td>
        <td>${(inv as any).order?.patient_name || '-'}</td>
        <td>${(inv as any).order?.restoration_type || '-'}</td>
        <td class="amount">${formatEGP(inv.final_total)}</td>
        <td class="amount">${formatEGP(inv.amount_paid || 0)}</td>
        <td class="amount">${formatEGP(inv.final_total - (inv.amount_paid || 0))}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html><html><head><title>Statement of Account</title>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;max-width:900px;margin:0 auto;color:#1a1a1a}
        .header{text-align:center;border-bottom:3px solid #2563eb;padding-bottom:20px;margin-bottom:30px}
        .header h1{color:#2563eb;margin:0 0 5px 0}
        .header h2{color:#666;margin:0;font-weight:normal}
        .info{display:flex;justify-content:space-between;margin-bottom:20px;padding:15px;background:#f8fafc;border-radius:8px}
        table{width:100%;border-collapse:collapse;margin:20px 0}
        th,td{padding:10px;text-align:left;border-bottom:1px solid #e2e8f0}
        th{background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#475569;font-weight:600}
        .amount{text-align:right;font-family:'Courier New',monospace}
        .totals{margin-top:20px;padding:20px;background:#f8fafc;border-radius:8px}
        .total-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0}
        .total-row.final{font-size:18px;font-weight:bold;border-top:2px solid #2563eb;padding-top:15px;margin-top:10px;border-bottom:none}
        .footer{margin-top:40px;text-align:center;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:20px}
        @media print{body{padding:20px}}
      </style></head><body>
      <div class="header">
        <h1>LABLINK</h1>
        <h2>Statement of Account — ${format(periodStart, "MMMM yyyy")}</h2>
      </div>
      <div class="info">
        <div><strong>Doctor:</strong> ${doctor?.name || '-'}</div>
        <div><strong>Period:</strong> ${format(periodStart, "MMM d")} – ${format(periodEnd, "MMM d, yyyy")}</div>
      </div>
      <table><thead><tr><th>Invoice</th><th>Patient</th><th>Type</th><th class="amount">Total</th><th class="amount">Paid</th><th class="amount">Balance</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="totals">
        <div class="total-row"><span>Total Invoiced</span><span>${formatEGP(totalAmount)}</span></div>
        <div class="total-row"><span>Total Paid</span><span style="color:#16a34a">${formatEGP(totalPaid)}</span></div>
        <div class="total-row final"><span>Balance Due</span><span style="color:${totalAmount - totalPaid > 0 ? '#dc2626' : '#16a34a'}">${formatEGP(totalAmount - totalPaid)}</span></div>
      </div>
      <div class="footer"><p>Generated ${format(new Date(), "MMMM d, yyyy h:mm a")} by LabLink</p></div>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Statement
          </DialogTitle>
          <DialogDescription>
            Bundle finalized invoices into a monthly statement for a doctor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Doctor</Label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors?.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {previewInvoices && previewInvoices.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invoices found</span>
                <Badge variant="secondary">{previewInvoices.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatEGP(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold text-green-600">{formatEGP(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance Due</span>
                <span className="font-semibold text-destructive">{formatEGP(totalAmount - totalPaid)}</span>
              </div>
            </div>
          )}

          {previewInvoices && previewInvoices.length === 0 && selectedDoctorId && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No finalized invoices for this doctor in the selected month
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {previewInvoices && previewInvoices.length > 0 && (
            <>
              <Button variant="outline" onClick={handleExport} className="gap-1.5">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Statement
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatementGenerator;
