/**
 * CSV & PDF export utilities for admin data.
 * Dynamically imported by admin tabs to keep out of main bundle.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(h => {
          const val = row[h] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(','),
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generic PDF export via print window with styled HTML table.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToPDF(data: Record<string, unknown>[], title: string, filename?: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const rows = data
    .map(
      row =>
        `<tr>${headers.map(h => `<td>${String(row[h] ?? '—')}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:40px;color:#1a1a2e}
  h1{font-size:20px;margin-bottom:4px}
  .meta{font-size:12px;color:#64748b;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f1f5f9;text-align:left;padding:10px 12px;border-bottom:2px solid #e2e8f0;font-weight:600;white-space:nowrap}
  td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
  tr:nth-child(even){background:#fafbfc}
  .footer{margin-top:32px;text-align:center;font-size:11px;color:#94a3b8}
  @media print{body{padding:20px}table{font-size:11px}}
</style></head><body>
<h1>${title}</h1>
<p class="meta">Generated ${new Date().toLocaleString()} &bull; ${data.length} record${data.length !== 1 ? 's' : ''}</p>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
<p class="footer">LabLink &mdash; ${new Date().getFullYear()}</p>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareActivityLogsForExport(logs: any[]) {
  return logs.map(l => ({
    Date: l.created_at,
    User: l.user_id,
    Action: l.action_type,
    Table: l.table_name,
    Record: l.record_id ?? '',
    IP: l.ip_address ?? '',
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareNotesForExport(notes: any[]) {
  return notes.map(n => ({
    Date: n.created_at,
    Order: n.order_number,
    Author: n.author_name,
    Note: n.note_text,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareOrdersForExport(orders: any[]) {
  return orders.map(o => ({
    OrderNumber: o.order_number,
    Status: o.status,
    Type: o.restoration_type,
    Patient: o.patient_name ?? '',
    Created: o.created_at,
    Doctor: o.doctor_id,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareUsersForExport(users: any[]) {
  return users.map(u => ({
    Name: u.full_name ?? '',
    Email: u.email ?? '',
    Role: u.role ?? '',
    Created: u.created_at,
    Onboarded: u.onboarding_completed ? 'Yes' : 'No',
  }));
}
