/**
 * CSV export utilities for admin data.
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
