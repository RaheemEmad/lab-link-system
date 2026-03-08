

# Plan: Soft-Delete Orders with Restore + Fix Cancellation Notifications to Lab

## Problem
1. **Delete is permanent** — `handleDelete` in `OrderDashboard` and `useOrdersQuery` does a hard `DELETE` from the `orders` table. No way to recover.
2. **Cancellation notification gap** — When the lab cancels, only the doctor is notified. But when the doctor cancels, notifications go to `order_assignments.user_id` entries — this may miss lab staff if the assignment table doesn't cover all relevant lab users. We need to also notify via the `assigned_lab_id` → `user_roles` path to reach all lab staff at that lab.

## Solution

### 1. Database Migration: Add soft-delete columns to `orders`

```sql
ALTER TABLE public.orders 
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid,
  ADD COLUMN pre_delete_status text;
```

This preserves the order data and remembers what status it had before deletion, so restore can put it back.

### 2. File: `src/components/OrderDashboard.tsx`

**Soft-delete instead of hard delete:**
- Change `handleDelete` to set `is_deleted = true, deleted_at = now(), deleted_by = user.id, pre_delete_status = currentStatus` instead of `.delete()`
- Add a **"Deleted Orders"** toggle/tab that queries `is_deleted = true` orders for the current doctor
- Add a **"Restore Order"** button per deleted order that sets `is_deleted = false, deleted_at = null, status = pre_delete_status`

**Filter out deleted orders in main fetch:**
- Add `.eq("is_deleted", false)` to the existing `fetchOrders` query

### 3. File: `src/hooks/useOrdersQuery.tsx`

- Add `.eq("is_deleted", false)` filter to the infinite query
- Change `deleteOrderMutation` to do a soft-delete update instead of `.delete()`
- Optimistically hide the order from the list on "delete"

### 4. File: `src/components/order/CancelOrderDialog.tsx`

**Fix lab notification on doctor cancel:**
- After notifying via `order_assignments`, also query `user_roles` where `lab_id = order.assigned_lab_id` to find all lab staff users and notify them (deduplicate with assignment user_ids)

**Fix doctor notification on lab cancel:**
- The current code fetches `doctor_id` after setting status to "Cancelled" — this works fine since we only update `status`, not `doctor_id`. No change needed here.
- But also notify all lab staff at the same lab (so other lab team members know), by querying `assigned_lab_id` from the order, then `user_roles` for that lab.

### 5. New Component: `src/components/order/RestoreOrderDialog.tsx`

Simple confirmation dialog with a "Restore" button that:
- Updates `is_deleted = false`, clears `deleted_at`/`deleted_by`, restores `status` from `pre_delete_status`
- Logs to `order_status_history`
- Invalidates queries

## Files Changed

| File | Change |
|------|--------|
| **Migration** | Add `is_deleted`, `deleted_at`, `deleted_by`, `pre_delete_status` columns to `orders` |
| `src/components/OrderDashboard.tsx` | Soft-delete logic, "Deleted Orders" section with restore button, filter `is_deleted = false` |
| `src/hooks/useOrdersQuery.tsx` | Filter `is_deleted = false`, soft-delete mutation |
| `src/components/order/CancelOrderDialog.tsx` | Notify all lab staff via `user_roles` + `assigned_lab_id`, deduplicate with assignments |
| `src/components/order/RestoreOrderDialog.tsx` | New — restore confirmation dialog for doctors |

