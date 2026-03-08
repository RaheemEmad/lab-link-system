

# Plan: Invoice & Billing System Enhancements

## What Already Exists
- Invoice generation (single + batch), line items, adjustments, expenses
- Payment tracking (pending/partial/paid/overdue) with auto-overdue detection
- Dispute workflow (raise + resolve with accept/reject/adjust)
- PDF export, audit log, monthly summary, analytics dashboard
- Invoice request flow (doctor requests → lab generates)
- Expense tracker, sort controls, search/filter

## Proposed Enhancements

### 1. Payment Reminders & Aging Report
**For labs**: See invoices grouped by aging buckets (0-30, 31-60, 61-90, 90+ days overdue). Auto-highlight at-risk invoices. Doctors see a "You have X overdue invoices" banner on their dashboard.

- **New component**: `src/components/billing/AgingReport.tsx` — table grouped by aging bucket with totals per bucket
- **Modify**: `BillingTab.tsx` — add "Aging Report" tab/button for lab_staff and admin
- **Modify**: `src/pages/Dashboard.tsx` — show overdue invoice banner for doctors

### 2. Credit Notes / Refund Tracking
When a lab needs to issue a partial refund or credit (e.g. defective work, redo), there's no mechanism today. Add a `credit_notes` table and UI.

- **Migration**: Create `credit_notes` table (`id, invoice_id, amount, reason, issued_by, created_at, status`) with RLS
- **New component**: `src/components/billing/CreditNoteDialog.tsx` — labs/admins issue credit notes against finalized invoices
- **Modify**: `InvoicePreview.tsx` — show linked credit notes section
- **Modify**: `InvoiceAnalyticsDashboard` — include net revenue (revenue - credits)

### 3. Recurring / Bundled Invoice (Statement of Account)
Doctors want a single monthly statement across all orders with one lab. Currently invoices are per-order only.

- **Migration**: Create `billing_statements` table (`id, doctor_id, lab_id, period_start, period_end, invoice_ids jsonb, total, status, created_at`)
- **New component**: `src/components/billing/StatementGenerator.tsx` — lab selects doctor + month → bundles all finalized invoices into a downloadable statement
- **New component**: `src/components/billing/StatementPreview.tsx` — printable multi-invoice summary with running total

### 4. Payment Method Tracking
Track HOW payments are made (cash, bank transfer, mobile wallet) for reconciliation.

- **Migration**: Add `payment_method` (text, nullable) and `payment_reference` (text, nullable) columns to `invoices`
- **Modify**: `PaymentDialog.tsx` — add payment method selector (Cash, Bank Transfer, Mobile Wallet, Check) and reference number field
- **Modify**: `InvoicePreview.tsx` PDF — include payment method info
- **Modify**: `MonthlyBillingSummary.tsx` — breakdown by payment method

### 5. Late Fee / Penalty Configuration
Labs can configure auto-applied late fees for overdue invoices.

- **Migration**: Add `late_fee_percent` (numeric, default 0) and `late_fee_applied` (numeric, default 0) to `invoices`; add `late_fee_policy_percent` (numeric, default 0) to `labs`
- **New component**: `src/components/billing/LateFeeSettings.tsx` — lab configures their late fee % in lab profile
- **Modify**: `BillingTab.tsx` overdue detection — when marking overdue, calculate and apply late fee from lab's policy
- **Modify**: `InvoicePreview.tsx` — show late fee as separate line

### 6. Invoice Email/Share (Shareable Link)
Generate a unique shareable link for an invoice so doctors can view/download without logging in.

- **Migration**: Add `share_token` (text, unique, nullable) to `invoices`
- **New edge function**: `supabase/functions/invoice-share/index.ts` — generates token, returns public URL; GET with token returns invoice data (no auth required)
- **Modify**: `InvoicePreview.tsx` — add "Share Invoice" button that generates link + copies to clipboard
- **New page**: `src/pages/SharedInvoice.tsx` — public read-only invoice view (route: `/invoice/:token`)

### 7. Bulk Payment Recording
Labs often receive lump-sum payments from a doctor covering multiple invoices. Allow recording one payment split across invoices.

- **New component**: `src/components/billing/BulkPaymentDialog.tsx` — select multiple invoices, enter total received, auto-allocate (oldest first or manual split)
- **Modify**: `BillingTab.tsx` — add "Record Bulk Payment" button

---

## Database Migrations Summary

```sql
-- Credit notes
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric NOT NULL,
  reason text NOT NULL,
  issued_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'issued',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Billing statements
CREATE TABLE public.billing_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  lab_id uuid NOT NULL REFERENCES labs(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  invoice_ids jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.billing_statements ENABLE ROW LEVEL SECURITY;

-- Payment method + reference on invoices
ALTER TABLE invoices ADD COLUMN payment_method text, ADD COLUMN payment_reference text;

-- Late fees
ALTER TABLE invoices ADD COLUMN late_fee_percent numeric DEFAULT 0, ADD COLUMN late_fee_applied numeric DEFAULT 0;
ALTER TABLE labs ADD COLUMN late_fee_policy_percent numeric DEFAULT 0;

-- Share token
ALTER TABLE invoices ADD COLUMN share_token text UNIQUE;
```

## Files Summary

| Action | File |
|--------|------|
| Migration | New SQL (credit_notes, billing_statements, invoice columns, labs column) |
| Create | `src/components/billing/AgingReport.tsx` |
| Create | `src/components/billing/CreditNoteDialog.tsx` |
| Create | `src/components/billing/StatementGenerator.tsx` |
| Create | `src/components/billing/StatementPreview.tsx` |
| Create | `src/components/billing/LateFeeSettings.tsx` |
| Create | `src/components/billing/BulkPaymentDialog.tsx` |
| Create | `src/pages/SharedInvoice.tsx` |
| Create | `supabase/functions/invoice-share/index.ts` |
| Modify | `src/components/billing/PaymentDialog.tsx` — payment method + reference |
| Modify | `src/components/billing/InvoicePreview.tsx` — credit notes, late fees, share button, payment method in PDF |
| Modify | `src/components/billing/BillingTab.tsx` — aging report, bulk payment, statement links |
| Modify | `src/components/billing/MonthlyBillingSummary.tsx` — payment method breakdown |
| Modify | `src/components/billing/InvoiceAnalyticsDashboard.tsx` — net revenue after credits |
| Modify | `src/pages/Dashboard.tsx` — overdue invoice banner for doctors |
| Modify | `src/App.tsx` — add `/invoice/:token` route |

