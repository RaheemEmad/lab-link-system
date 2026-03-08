

# Plan: Clickable Logistics KPI Cards + Restore Order Sends Lab Notification

## Changes

### 1. Logistics KPI Cards — Make Clickable with Filter + Deselect on Whitespace

**File: `src/pages/LogisticsDashboard.tsx`**

- Add `kpiFilter` state (similar to OrderDashboard pattern) with a filter key like `"total"`, `"active"`, `"inTransit"`, `"pending"`, `"ready"`, `"urgent"`, `"priority"`
- Make each of the 7 metric cards clickable with `cursor-pointer`, hover scale, and active ring styling (reuse the same visual pattern from `DashboardKPICards`)
- Clicking a card filters the shipments list below to only show matching orders
- Clicking the same card again clears the filter (toggle behavior)
- Add an `onClick` on the shipments container wrapper (the outer `div`) that clears `kpiFilter` when clicking whitespace — use `e.target === e.currentTarget` to only trigger on the background, not on child elements
- Apply `kpiFilter` to the `shipments.map()` render loop via a `filteredShipments` memo

### 2. Restore Order — Notify Lab Staff

**File: `src/components/order/RestoreOrderDialog.tsx`**

- After the restore DB update succeeds, fetch the order's `assigned_lab_id` from the restored order
- If `assigned_lab_id` exists, query `user_roles` where `lab_id = assigned_lab_id` and `role = 'lab_staff'` to get all lab staff user IDs
- Use `createNotification` (from `@/lib/notifications`) to send each lab staff member a notification:
  - `type: "order_restored"`
  - `title: "Order Restored"`
  - `message: "Order {orderNumber} has been restored and is back in your queue."`

### 3. OrderDashboard — Deselect KPI on Whitespace Click

**File: `src/components/OrderDashboard.tsx`**

- Add an `onClick` handler on the main content wrapper that clears `kpiFilter` when clicking whitespace (same `e.target === e.currentTarget` pattern)

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LogisticsDashboard.tsx` | Add `kpiFilter` state, clickable KPI cards with filter/toggle, `filteredShipments` memo, whitespace deselect |
| `src/components/order/RestoreOrderDialog.tsx` | After restore, fetch `assigned_lab_id`, notify all lab staff via `createNotification` |
| `src/components/OrderDashboard.tsx` | Add whitespace click to clear KPI filter |

