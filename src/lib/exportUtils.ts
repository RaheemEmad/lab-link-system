// Utility functions for exporting data to CSV and PDF

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatDateForExport = (date: string | null) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

export const prepareUsersForExport = (users: any[]) => {
  return users.map(user => ({
    'Name': user.full_name || '',
    'Email': user.email,
    'Role': user.role || 'none',
    'Organization': user.clinic_name || user.lab_name || '',
    'Phone': user.phone || '',
    'Status': user.onboarding_completed ? 'Active' : 'Pending',
    'Joined Date': formatDateForExport(user.created_at),
  }));
};

export const prepareOrdersForExport = (orders: any[]) => {
  return orders.map(order => ({
    'Order Number': order.order_number,
    'Doctor': order.doctor_name,
    'Patient': order.patient_name,
    'Type': order.restoration_type,
    'Status': order.status,
    'Urgency': order.urgency,
    'Lab Assigned': order.assigned_lab_id ? 'Yes' : 'No',
    'Expected Delivery': formatDateForExport(order.expected_delivery_date),
    'Created Date': formatDateForExport(order.created_at),
  }));
};

export const prepareActivityLogsForExport = (logs: any[]) => {
  return logs.map(log => ({
    'Timestamp': formatDateForExport(log.created_at),
    'Action': log.action_type,
    'Table': log.table_name,
    'User ID': log.user_id?.substring(0, 8) || 'system',
    'IP Address': log.ip_address || '',
    'Details': JSON.stringify(log.metadata || {}),
  }));
};

export const prepareNotesForExport = (notes: any[]) => {
  return notes.map(note => ({
    'Timestamp': formatDateForExport(note.created_at),
    'Order': note.order_number,
    'Author': note.author_name,
    'Note': note.note_text,
    'Likes': note.likes_count || 0,
  }));
};
