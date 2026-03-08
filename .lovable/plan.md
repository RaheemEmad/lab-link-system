

# Plan: Wire Up Complete Real-Time Notification System

## Critical Infrastructure Fixes

### 1. Enable Realtime for `notifications` Table
The `useRealtimeNotifications` hook subscribes to postgres_changes on `notifications`, but the table was **never added to the realtime publication**. This means no real-time popups work at all currently.

**Migration**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`

### 2. Mount `NotificationPopup` in App.tsx
The `NotificationPopup` component (which initializes the realtime listener) is **never rendered** anywhere. It must be added inside `AppContent` so it runs for all authenticated users.

**File**: `src/App.tsx` — add `<NotificationPopup />` alongside `<SessionTimeoutWarning />`

---

## Missing Notification Triggers (11 Gaps)

Every action below performs a DB write but never creates a notification record. Each will get a `createNotification()` call after the successful mutation, following the existing pattern.

| # | File | Action | Who Gets Notified | Type |
|---|------|--------|-------------------|------|
| 1 | `BidSubmissionDialog.tsx` | Lab submits bid/application | Doctor (order owner) | `bid_submitted` |
| 2 | `LabRequestsManagement.tsx` | Doctor declines bid | Lab user who submitted | `bid_declined` |
| 3 | `CancelOrderDialog.tsx` | Either party cancels order | The other party (doctor or lab) | `order_cancelled` |
| 4 | `PaymentDialog.tsx` | Lab records payment | Doctor (order owner) | `payment_recorded` |
| 5 | `CreditNoteDialog.tsx` | Lab issues credit note | Doctor (order owner) | `credit_note_issued` |
| 6 | `BulkPaymentDialog.tsx` | Lab records bulk payment | Each affected doctor | `payment_recorded` |
| 7 | `InvoiceGenerator.tsx` | Lab generates invoice(s) | Doctor (order owner) | `invoice_generated` |
| 8 | `InvoiceRequestButton.tsx` | Doctor requests invoice | Lab staff (assigned) | `invoice_request` |
| 9 | `DisputeDialog.tsx` | Doctor raises dispute | Lab staff (assigned) | `invoice_disputed` |
| 10 | `DisputeResolutionDialog.tsx` | Admin resolves dispute | Both doctor and lab | `dispute_resolved` |
| 11 | `PostDeliveryReviewDialog.tsx` | Doctor submits review | Lab staff (assigned) | `review_submitted` |

### 3. Add Missing Types to Popup List
Add `order_cancelled`, `payment_recorded`, `credit_note_issued`, `review_submitted` to `POPUP_NOTIFICATION_TYPES` in `useRealtimeNotifications.tsx`.

---

## Implementation Pattern

Each notification follows the existing `createNotification()` pattern from `src/lib/notifications.ts`. The notification is inserted into the DB **after** the main mutation succeeds. The realtime subscription picks it up and shows the toast + native notification automatically.

For actions that need to look up the other party (e.g., CancelOrderDialog needs to find the lab user), we fetch `order_assignments` or `orders.doctor_id` before inserting the notification.

---

## Files Summary

| Action | File |
|--------|------|
| Migration | Enable realtime for `notifications` table |
| Modify | `src/App.tsx` — mount `NotificationPopup` |
| Modify | `src/hooks/useRealtimeNotifications.tsx` — add missing types |
| Modify | `src/components/order/BidSubmissionDialog.tsx` — notify doctor |
| Modify | `src/pages/LabRequestsManagement.tsx` — notify lab on decline |
| Modify | `src/components/order/CancelOrderDialog.tsx` — notify other party |
| Modify | `src/components/billing/PaymentDialog.tsx` — notify doctor |
| Modify | `src/components/billing/CreditNoteDialog.tsx` — notify doctor |
| Modify | `src/components/billing/BulkPaymentDialog.tsx` — notify doctors |
| Modify | `src/components/billing/InvoiceGenerator.tsx` — notify doctors |
| Modify | `src/components/billing/InvoiceRequestButton.tsx` — notify lab |
| Modify | `src/components/billing/DisputeDialog.tsx` — notify lab |
| Modify | `src/components/billing/DisputeResolutionDialog.tsx` — notify both |
| Modify | `src/components/order/PostDeliveryReviewDialog.tsx` — notify lab |

