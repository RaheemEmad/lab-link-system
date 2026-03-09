

# Notification Coverage Gaps & Engagement Plan

## Current State
Notifications fire correctly in: status updates, delivery confirmations, invoicing, disputes, payments, bids, cancellations, order notes, and reviews. The realtime listener and native push system are wired up.

## Missing Notification Triggers (12 gaps found)

### 1. Marketplace — Lab applies to order
`OrdersMarketplace.tsx` line ~200: `lab_work_requests.insert` has NO notification to the doctor that a lab applied.

### 2. Marketplace — Admin override assignment
`OrdersMarketplace.tsx` line ~257: Admin assigns lab directly — no notification to the lab or doctor.

### 3. Direct Messages — New message received
`Messages.tsx` line ~148: DM insert has no notification to the receiver. User has no idea they got a message unless they're on the Messages page.

### 4. Appointment Scheduled
`AppointmentScheduling.tsx` line ~175: Appointment created — no notification to the other party (lab or doctor).

### 5. Appointment Confirmed / Cancelled
Appointment status changes (confirm/cancel) — no notifications found.

### 6. Design Approval / Revision Requested
`DesignApprovalWorkflow.tsx` line ~87: Doctor approves or requests revision — toast says "lab has been notified" but NO actual notification is created.

### 7. Feedback Room — Attachment uploaded / Checklist updated
No notifications in any `feedback-room/` components. When a doctor or lab uploads an attachment or checks off an item, the other party is unaware.

### 8. New Order Created (to assigned lab)
`create-order` edge function and `NewOrder.tsx` — no notification to the assigned lab when an order is directly assigned to them.

### 9. Order Edited
`EditOrder.tsx` line ~319: Notifications go to lab staff but NOT to the doctor (confirmation that edit was saved).

### 10. Support Ticket Status Update
When admin updates a support ticket — no notification back to the user.

### 11. Lab Work Request — Lab updates bid (revised amount)
`BidRevisionDialog.tsx` handles bid revision notifications, but the initial bid submission from `BidSubmissionDialog.tsx` only notifies the doctor — missing notification when bid is revised by lab after doctor requests revision.

### 12. Recurring Order Created
When a recurring schedule fires and creates an order — no notification to the user.

## Implementation Plan

### Files to modify (add `createNotification` calls):

1. **`src/pages/OrdersMarketplace.tsx`** — Add notifications in `applyForOrder` (notify doctor) and `adminOverrideAssignment` (notify lab staff + doctor).

2. **`src/pages/Messages.tsx`** — Add notification on DM send (type: `new_message`, notify receiver).

3. **`src/pages/AppointmentScheduling.tsx`** — Add notifications on create, confirm, cancel appointment (notify the other party).

4. **`src/pages/DesignApprovalWorkflow.tsx`** — Add notification on approve/reject (notify lab staff via order assignments).

5. **`src/components/feedback-room/AttachmentUploader.tsx`** — Add notification when attachment uploaded (notify other party).

6. **`src/components/feedback-room/ChecklistItem.tsx`** — Add notification when checklist item confirmed.

7. **`src/pages/EditOrder.tsx`** — Verify doctor gets confirmation notification.

8. **`supabase/functions/create-order/index.ts`** — Add notification to assigned lab when order is created with a direct lab assignment.

9. **`src/hooks/useRealtimeNotifications.tsx`** — Add new notification types to `POPUP_NOTIFICATION_TYPES`: `new_message`, `appointment_scheduled`, `appointment_confirmed`, `appointment_cancelled`, `design_approved`, `design_revision_requested`, `new_marketplace_application`, `order_edited`, `feedback_attachment`, `checklist_updated`, `ticket_status_update`.

10. **`src/components/support/SupportTicketsList.tsx`** or admin — Add notification when ticket status changes.

### New notification types to register:
- `new_message`
- `new_marketplace_application`
- `admin_order_override`
- `appointment_scheduled`
- `appointment_confirmed`
- `appointment_cancelled`
- `design_approved`
- `design_revision_requested`
- `feedback_attachment`
- `checklist_updated`
- `order_edited`
- `ticket_status_update`

### Engagement extras:
- Add notification sound differentiation (message sound vs order sound) — leverage existing `useNotificationSound`
- Add `new_message` type to realtime DM invalidation so unread badge shows in nav

All changes are additive — just importing `createNotification` from `@/lib/notifications` and adding 1-5 lines after each DB write. No schema changes needed since the `notifications` table already supports arbitrary `type` strings.

