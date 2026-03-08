

# Plan: Logistics Tab Notification Badges

## Context
URL query param support (`/logistics?tab=analytics`) **already works** — lines 70-83 of `LogisticsDashboard.tsx` handle this. No changes needed there.

The remaining task is adding **notification badges** on each tab showing pending action counts.

## Approach

### New Hook: `src/hooks/useLogisticsTabBadges.tsx`
A single hook that queries the `notifications` table for the current user's **unread** notifications (`read = false`), grouped by `type`, and maps them to tab badge counts:

| Tab | Notification Types Counted | Additional Data-Derived Counts |
|-----|---------------------------|-------------------------------|
| **Shipments** | `shipment_update`, `order_cancelled` | Urgent undelivered orders from `shipments` prop |
| **Tracking** | `delivery_confirmed`, `shipment_update` | — |
| **Calendar** | — | — (static, no badge) |
| **Analytics** | — | — (static, no badge) |
| **Scheduling** | `appointment_scheduled` | — |
| **Billing** | `payment_recorded`, `invoice_generated`, `invoice_request`, `invoice_disputed`, `credit_note_issued`, `dispute_resolved` | — |

The hook will:
1. Query `notifications` where `user_id = current user`, `read = false`, select `type`
2. Count occurrences per type
3. Map types to tabs
4. Also accept `shipments` array to compute data-derived badges (e.g., overdue deliveries for Shipments tab)
5. Subscribe to realtime changes on `notifications` to keep counts live

### Modify: `src/pages/LogisticsDashboard.tsx`
- Import and call `useLogisticsTabBadges(user.id, shipments)`
- Add a small red dot/count badge next to each `TabsTrigger` label when count > 0
- Badge renders as a `<span>` with `bg-destructive text-white rounded-full text-[10px] min-w-[18px] h-[18px]` inside the trigger

## Files

| Action | File |
|--------|------|
| Create | `src/hooks/useLogisticsTabBadges.tsx` |
| Modify | `src/pages/LogisticsDashboard.tsx` — add badge rendering to tab triggers |

