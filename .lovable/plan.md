

# Plan: Make KPI Cards Clickable to Filter Orders

## What Changes

**File: `src/components/dashboard/DashboardKPICards.tsx`**

- Add an `onFilterChange` callback prop: `(filter: { status?: string; urgency?: string }) => void`
- Each card gets a filter key mapping:
  - "Total Active" / "Queue Size" → status `"active"` (custom filter meaning non-delivered/cancelled)
  - "Urgent Orders" / "Urgent" → urgency filter
  - "Awaiting Delivery" / "Ready for QC" → specific status filter
  - "Delivered This Month" / "Completed This Month" → status `"Delivered"`
- Make each `Card` clickable with `cursor-pointer`, hover effect, and an active/selected ring state
- Add an `activeFilter` prop to show which card is currently selected
- Clicking the same card again clears the filter

**File: `src/components/OrderDashboard.tsx`**

- Add a `kpiFilter` state: `{ status?: string; urgency?: string } | null`
- Pass `onFilterChange` and `activeFilter` to `DashboardKPICards`
- Integrate `kpiFilter` into `filteredOrders` memo — when a KPI filter is active, it overrides the status dropdown filter with the appropriate logic:
  - `"active"` → exclude Delivered/Cancelled
  - `"urgent"` → filter `urgency === "Urgent"` + active only
  - Specific status → exact match
- When a KPI card is tapped, scroll down to the orders table (smooth scroll via ref)
- When the status dropdown is manually changed, clear the `kpiFilter`

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardKPICards.tsx` | Add click handlers, active state styling, filter callback |
| `src/components/OrderDashboard.tsx` | Add `kpiFilter` state, integrate into filtering logic, scroll to table on KPI click |

