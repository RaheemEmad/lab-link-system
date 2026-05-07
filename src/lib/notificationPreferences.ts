// Single source of truth for notification event categories shown in settings.
export const NOTIFICATION_CATEGORIES = [
  { key: "orders", label: "Orders", description: "New orders, assignments, status changes, edits" },
  { key: "lab_requests", label: "Lab requests", description: "Marketplace applications, accepts, refusals" },
  { key: "messages", label: "Messages & feedback", description: "Chat messages, feedback room activity, notes" },
  { key: "payments", label: "Payments & wallet", description: "Approvals, rejections, deposits, subscription" },
  { key: "invoices", label: "Invoices & billing", description: "Generated invoices, disputes, credit notes" },
  { key: "delivery", label: "Delivery & SLA", description: "Delivery confirmations, SLA warnings, issues" },
  { key: "appointments", label: "Appointments", description: "Scheduling, confirmations, cancellations" },
  { key: "support", label: "Support tickets", description: "Ticket replies and status updates" },
  { key: "system", label: "System & security", description: "Security alerts, admin overrides, account events" },
] as const;

export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number]["key"];

// Map every notification.type → category. Unmapped → "system".
const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  // orders
  new_order: "orders",
  order_assigned: "orders",
  status_change: "orders",
  status_update: "orders",
  order_edited: "orders",
  order_cancelled: "orders",
  admin_order_override: "orders",
  new_marketplace_order: "orders",
  // lab_requests
  lab_request: "lab_requests",
  lab_request_cancelled: "lab_requests",
  request_accepted: "lab_requests",
  request_refused: "lab_requests",
  new_lab_request: "lab_requests",
  new_marketplace_application: "lab_requests",
  bid_submitted: "lab_requests",
  bid_accepted: "lab_requests",
  bid_declined: "lab_requests",
  order_accepted: "lab_requests",
  // messages
  new_message: "messages",
  new_note: "messages",
  note_liked: "messages",
  feedback_received: "messages",
  feedback_attachment: "messages",
  checklist_updated: "messages",
  review_submitted: "messages",
  // payments
  payment_approved: "payments",
  payment_rejected: "payments",
  payment_recorded: "payments",
  // invoices
  invoice_generated: "invoices",
  invoice_request: "invoices",
  invoice_disputed: "invoices",
  dispute_resolved: "invoices",
  credit_note_issued: "invoices",
  // delivery
  delivery_confirmed: "delivery",
  delivery_issue: "delivery",
  sla_warning: "delivery",
  // appointments
  appointment_scheduled: "appointments",
  appointment_confirmed: "appointments",
  appointment_cancelled: "appointments",
  design_approved: "appointments",
  design_revision_requested: "appointments",
  // support
  ticket_status_update: "support",
};

export function categoryForType(type: string): NotificationCategory {
  return TYPE_TO_CATEGORY[type] ?? "system";
}
