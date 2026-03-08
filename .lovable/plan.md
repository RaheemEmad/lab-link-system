

# Plan: All 10 Order Dashboard Enhancements

## Overview
Enhance `OrderDashboard.tsx` with KPI cards, date range filter, sortable columns, quick-view drawer, saved filters, progress timeline, reorder button, workload heatmap, deadline column, and batch export. No database migrations needed — all data already exists.

---

## 1. KPI Summary Cards
Add a row of 4 stat cards above the table:
- **Doctor view**: Total Active, Urgent Orders, Awaiting Delivery, Delivered This Month
- **Lab view**: Queue Size, Urgent, Ready for QC, Completed This Month

Computed from the `orders` array already in state. New component: `src/components/dashboard/DashboardKPICards.tsx`

## 2. Date Range Filter
Add a date range picker (preset buttons: "This Week", "This Month", "Last 30 Days", "All") alongside existing status filter. Filter `filteredOrders` by `timestamp` range.

Implemented inline in `OrderDashboard.tsx` using existing `Select` component with preset options (no calendar picker needed for simplicity).

## 3. Sortable Columns
Add `sortField` and `sortDirection` state. Clickable column headers (Order ID, Patient, Type, Urgency, Status, Date) toggle sort. Apply sort to `filteredOrders` before pagination. Add `ArrowUpDown` icon to sortable headers.

## 4. Quick-View Detail Drawer
New component: `src/components/dashboard/OrderQuickView.tsx` — a `Sheet` (slide-out panel) showing full order details, status timeline mini-view, chat shortcut, and notes preview. Triggered by clicking an order row (not the action menu).

Uses existing `Sheet` from `@/components/ui/sheet`.

## 5. Saved Filter Presets
Store filter combos in `localStorage` per user. New component: `src/components/dashboard/SavedFilters.tsx` — dropdown to save/load/delete named presets (status + search + date range + sort). Max 5 presets.

## 6. Progress Timeline Strip (Doctor)
For doctor view, add a small horizontal progress indicator on each order card/row showing: Pending → In Progress → QC → Delivery → Delivered. Highlight the current step. New component: `src/components/dashboard/OrderProgressStrip.tsx`.

## 7. Reorder Button (Doctor)
For delivered orders (doctor view), add a "Reorder" button in the action menu that navigates to `/new-order` with prefilled query params (`patient_name`, `restoration_type`, `teeth_shade`, `teeth_number`, `shade_system`).

## 8. Workload Heatmap (Lab)
For lab view, add a mini bar chart above the table showing order counts by status. New component: `src/components/dashboard/WorkloadHeatmap.tsx` — simple colored bars (no recharts needed, pure CSS).

## 9. Deadline Column (Lab)
Add `expected_delivery_date` to the orders query select. Show a "Deadline" column for lab staff with the date and color coding (green = on track, amber = due soon, red = overdue). Use existing `expected_delivery_date` from DB.

## 10. Batch Export
Add "Export CSV" button next to filters. Exports current filtered/sorted view using existing `exportToCSV` from `src/lib/exportUtils.ts`. Include all visible columns.

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/dashboard/DashboardKPICards.tsx` |
| Create | `src/components/dashboard/OrderQuickView.tsx` |
| Create | `src/components/dashboard/SavedFilters.tsx` |
| Create | `src/components/dashboard/OrderProgressStrip.tsx` |
| Create | `src/components/dashboard/WorkloadHeatmap.tsx` |
| Modify | `src/components/OrderDashboard.tsx` — integrate all 10 features |

No database migrations required. All data fields already exist in the schema.

