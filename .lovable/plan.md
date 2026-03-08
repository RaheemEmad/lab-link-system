

# Plan: Connect Patient Cases to Orders & Fix Logistics Badge Real-time Updates

## Issues Found

### 1. Patient Cases — Not Showing Linked Orders
The `patient_cases` table has `last_order_id` and `order_count` fields, and the `DeliveryConfirmationDialog` correctly creates/updates cases on delivery. However, the **Cases page doesn't display linked order history** — it only shows a generic "X orders" count with no way to view the actual orders tied to a case. There's also no "View Order" action per case.

### 2. Logistics Tab Badges — Shipment Badge Not Updating from Actual Shipment Data
The `useLogisticsTabBadges` hook computes badge counts from two sources: unread notifications and shipment data (overdue/urgent). However, the shipments array passed from `LogisticsDashboard` is fetched once on mount and via a realtime channel, but the **badge hook's `computeBadges` function only re-runs when notifications change** — shipment-derived counts (overdue, urgent) only update when `computeBadges` is called, which is tied to the notification fetch cycle, not shipment data changes.

## Solution

### File: `src/pages/PatientCases.tsx`
- Add a **"View Orders"** button per case card that opens a dialog showing orders linked to that patient (query `orders` table by `patient_name` + `doctor_id`)
- Show the last order status badge on each case card
- Add a **"View Last Order"** link that navigates to the order detail or logistics tracking

### File: `src/hooks/usePatientCases.tsx`
- Extend the query to join `last_order_id` → `orders(id, order_number, status, created_at)` so we get order context without an extra fetch

### File: `src/hooks/useLogisticsTabBadges.tsx`
- Split shipment-derived badge counts out of `computeBadges` so they recompute whenever `shipments` changes, independent of notification fetches
- Add `shipments` to the `useEffect` dependency array so badge recalculates when shipment data updates from the realtime channel

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePatientCases.tsx` | Join `last_order_id` to get order number/status |
| `src/pages/PatientCases.tsx` | Add order status badge on cards, "View Orders" dialog querying orders by patient name, "View Last Order" navigation |
| `src/hooks/useLogisticsTabBadges.tsx` | Ensure shipment-derived counts update when `shipments` prop changes, not only on notification fetch |

