

# LabLink Platform Gap Analysis — What's Missing to Be Best-in-Class

## Perspective: General User, CTO, Dentist, Lab

---

## CRITICAL MISSING FEATURES

### 1. Account Self-Service & GDPR Compliance
**Gap**: No account deletion, no data export, no account deactivation flow.
- No "Delete My Account" button anywhere in Profile or Settings
- No "Export My Data" (GDPR Article 20 — data portability)
- No account deactivation (soft-delete) for labs or doctors
- **Who cares**: Every user, CTO (legal compliance)

### 2. Two-Factor Authentication (2FA/MFA)
**Gap**: Zero implementation. No TOTP, no SMS verification, no recovery codes.
- Critical for HIPAA-adjacent dental data platform
- **Who cares**: CTO, every user handling patient data

### 3. In-App Support / Help Center / Ticket System
**Gap**: Contact page exists but is static. No ticketing, no live chat, no knowledge base.
- No way for users to track support requests
- No contextual help beyond tooltips
- **Who cares**: All users, especially onboarding dentists and labs

### 4. Email Notification Delivery
**Gap**: Settings toggle for email notifications exists but no actual email sending infrastructure (no edge function for transactional emails).
- Order status changes, invoice reminders, delivery confirmations — all notification-only (in-app)
- **Who cares**: Dentists and labs who aren't always in-app

### 5. Lab-to-Doctor Direct Messaging (Outside Orders)
**Gap**: Chat exists per-order (`OrderChatWindow`) but no general messaging between a doctor and their preferred lab.
- **Who cares**: Dentists wanting to ask pre-order questions, labs wanting to upsell

---

## HIGH-VALUE MISSING FEATURES

### 6. Recurring Orders / Subscription Orders
**Gap**: Templates exist but no "schedule this order weekly/monthly" automation.
- Dental practices with repeat patients (retainers, night guards) need this
- **Who cares**: Dentists with high volume

### 7. Lab Comparison Tool (Side-by-Side)
**Gap**: `CompareLabsDialog.tsx` exists as a component but is never routed or accessible from Labs listing page.
- **Who cares**: Dentists choosing between labs

### 8. Onboarding Completeness Enforcement
**Gap**: Onboarding is optional after role selection. Profile completion page exists but isn't gated.
- Labs can operate without setting pricing, specializations, or portfolio
- Doctors can create orders without completing clinic info
- **Who cares**: CTO (data quality), all users (trust)

### 9. Bulk Order Import (CSV/Excel)
**Gap**: `ImportOrderDialog.tsx` exists but only for single-order JSON-like import. No CSV/spreadsheet bulk import.
- **Who cares**: Dentists migrating from other systems

### 10. Payment Gateway Integration
**Gap**: Invoice system is comprehensive but payment is manual (mark as paid). No Stripe, no online payment.
- **Who cares**: CTO (revenue), labs (cash flow), dentists (convenience)

### 11. Reporting & PDF Export for Invoices
**Gap**: `InvoicePreview` and `OrderReceiptPDF` components exist but actual PDF generation (html-to-pdf) is unclear. No monthly statement PDF download.
- **Who cares**: Labs and dentists for accounting

### 12. Admin Bulk User Management
**Gap**: Admin can edit individual users but no bulk invite, bulk role assign, or bulk deactivate.
- **Who cares**: CTO scaling the platform

---

## UX FLOW GAPS

### 13. Empty State Guidance
Several pages show generic empty states without actionable CTAs:
- Dashboard for new users with no orders — should guide to "Create First Order" or "Set Up Lab Profile"
- Marketplace with no available orders — no guidance for labs

### 14. Mobile Deep-Link Handling
No handling for push notification deep-links (clicking a notification should navigate to the relevant order/chat).

### 15. Session Persistence Across Tabs
`SessionTimeoutWarning` exists but no cross-tab session sync (logging out in one tab doesn't affect others).

---

## IMPLEMENTATION PLAN (Priority Order)

### Phase 1 — Security & Compliance (Most Critical)
1. **Account deletion flow** — Profile page "Delete Account" with confirmation, calls edge function to cascade-delete user data, then `supabase.auth.admin.deleteUser()`
2. **Data export** — Edge function that collects all user data (orders, invoices, messages, profile) into a JSON/ZIP download
3. **2FA setup** — Leverage Supabase Auth MFA (TOTP) with QR code enrollment in Settings

### Phase 2 — Communication & Engagement
4. **Transactional email edge function** — Using Supabase's built-in email or a connector (Resend/SendGrid) for order status, invoice, and reminder emails
5. **General messaging** — New `direct_messages` table + UI accessible from Preferred Labs and Lab Profile pages
6. **In-app help/support tickets** — Simple `support_tickets` table + UI in Settings or via HelpButton

### Phase 3 — Revenue & Growth
7. **Payment integration** — Stripe connector for invoice payment
8. **Recurring orders** — Scheduling UI on templates with a cron-triggered edge function
9. **Bulk CSV import** — Parse + validate + batch-insert via edge function

### Phase 4 — Polish
10. **Lab comparison** — Wire existing `CompareLabsDialog` into Labs listing
11. **Onboarding enforcement** — Middleware/guard that blocks dashboard access until profile is complete
12. **PDF generation** — Edge function using a headless renderer for invoice/statement PDFs

---

## Database Changes Required
- `support_tickets` table (user_id, subject, status, messages jsonb)
- `direct_messages` table (sender_id, receiver_id, content, read_at)
- `recurring_order_schedules` table (template_id, frequency, next_run_at)
- `user_deletion_requests` table (user_id, status, requested_at, completed_at)
- Enable Supabase Auth MFA factor enrollment

## Edge Functions Required
- `delete-user-data` — GDPR cascade deletion
- `export-user-data` — Data portability
- `send-transactional-email` — Status/invoice/reminder emails
- `process-recurring-orders` — Cron-based order creation
- `bulk-import-orders` — CSV parsing + validation

---

## Summary by Persona

| Persona | Top 3 Missing Features |
|---------|----------------------|
| **Dentist** | Email notifications, recurring orders, payment gateway |
| **Lab** | Direct messaging, email alerts, PDF invoices |
| **CTO** | 2FA/MFA, GDPR compliance, payment integration |
| **General User** | Account deletion, support tickets, onboarding enforcement |

