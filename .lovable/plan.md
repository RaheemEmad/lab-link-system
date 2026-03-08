

# Unified Inbox / Command Center

## Overview
Create a new `/inbox` page that aggregates 4 data streams into a single prioritized feed grouped by order, with inline quick actions. No new DB tables needed — all data comes from existing tables.

## Data Sources (all existing tables)
1. **Unread chats** — `chat_messages` where `read_at IS NULL` and `sender_id != current_user`
2. **Pending design approvals** — `orders` where `design_file_url IS NOT NULL` and `design_approved IS NULL` and `doctor_id = current_user`
3. **Delivery confirmations** — `orders` where `delivery_pending_confirmation = true` and `doctor_id = current_user`
4. **Overdue invoices** — `invoices` where `payment_status = 'overdue'` joined with `orders` for user filtering

For lab_staff: show chats + orders assigned to them (via `order_assignments`).

## Architecture

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/Inbox.tsx` | Main Unified Inbox page |
| `src/hooks/useInboxItems.tsx` | Hook that fetches + merges all 4 data streams into a unified feed |

### Files to Modify
| File | Change |
|------|---------|
| `src/App.tsx` | Add `/inbox` route |
| `src/components/layout/MobileBottomNav.tsx` | Replace alerts icon with inbox icon |
| `src/components/landing/LandingNav.tsx` | Add Inbox link in nav dropdown |
| `src/lib/i18n/types.ts` | Add inbox translation keys |
| `src/lib/i18n/en.ts` | English inbox translations |
| `src/lib/i18n/ar.ts` | Arabic inbox translations |

## UI Design

### Page Layout
- Uses `PageLayout` + `ProtectedRoute`
- Top: summary badges showing counts per category (chats, approvals, deliveries, invoices)
- Filter tabs: All | Chats | Approvals | Deliveries | Invoices
- Feed: Cards grouped by order, sorted by most recent activity (newest first)

### Inbox Item Card
Each card shows:
- Order number + patient name (header)
- Category badge (color-coded: blue=chat, amber=approval, green=delivery, red=invoice)
- Timestamp (relative via `date-fns`)
- Preview text (last message / "Design ready for review" / "Confirm delivery" / "Invoice overdue: EGP X")
- **Inline quick actions** per type:
  - Chat → "Reply" button opens `OrderChatWindow`
  - Approval → "Approve" / "Reject" buttons (inline mutation)
  - Delivery → "Confirm" button opens `DeliveryConfirmationDialog`
  - Invoice → "Pay" button navigates to billing tab on dashboard

### Empty State
Uses existing `EmptyState` component with "All caught up!" messaging.

## Hook: `useInboxItems`
- 4 parallel React Query calls (independent data sources)
- Merges results into unified `InboxItem[]` with common shape:
  ```typescript
  interface InboxItem {
    id: string;
    type: 'chat' | 'approval' | 'delivery' | 'invoice';
    orderId: string;
    orderNumber: string;
    patientName: string;
    title: string;
    preview: string;
    timestamp: string;
    metadata: Record<string, any>;
  }
  ```
- Sorted by timestamp descending
- `staleTime: 30_000`, `enabled: !!user?.id`

## Role-Aware Behavior
- **Doctors**: See all 4 categories
- **Lab staff**: See unread chats + orders assigned to them (no invoices/approvals — those are doctor-side)
- **Admin**: See all across the platform

## i18n Keys
```
inbox: {
  title, subtitle, all, chats, approvals, deliveries, invoices,
  reply, approve, reject, confirmDelivery, payNow,
  allCaughtUp, noItems, designReady, deliveryReady, overdueInvoice
}
```

## Responsiveness
- Cards stack vertically on mobile with full-width touch targets
- Filter tabs scroll horizontally on small screens
- Chat reply opens as sheet on mobile, dialog on desktop
- RTL-aware with `ltr:`/`rtl:` Tailwind variants for directional padding

