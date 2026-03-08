

# Plan: Redesign Shipments Tab UI + Active Shipment Modal

## Overview

Redesign the Shipments tab in the Logistics Dashboard with better UI/UX, and make each active shipment card clickable to open a unified modal showing order details, shipment info, and notes — replacing the current two-button approach (Order Details + Shipment & Notes).

## Changes

### 1. Redesign Shipment Cards (LogisticsDashboard.tsx, lines 263-301)

Replace the current flat `div` shipment items with proper card-based layout:

- Each shipment becomes a visually distinct, tappable card with:
  - Left color accent bar based on status
  - Header row: order number, patient name, status badge, urgency badge
  - Body: 2-column grid showing lab, restoration type, dates (desired/proposed), carrier/driver info (condensed)
  - Handling instructions shown as a compact warning banner if present
  - Remove the two separate buttons ("Order Details" and "Edit Shipment & Notes")
  - Make the entire card clickable → opens the unified modal
  - Add a subtle "Tap to view details" hint on mobile
- KPI cards: keep as-is, they already look good

### 2. New Unified Shipment Detail Modal (new component)

**New file: `src/components/order/ShipmentDetailModal.tsx`**

A single modal that combines the content of `OrderDetailsModal` and `ShipmentDetailsDialog` into one tabbed view:

- **Tab 1: Order Details** — Patient info, treatment details (restoration type, teeth, shade), biological notes, handling instructions, approval notes
- **Tab 2: Shipment** — Carrier/driver info with WhatsApp links, tracking number, delivery dates (desired vs proposed), pickup time, location. Lab staff gets inline edit mode.
- **Tab 3: Notes** — Reuses the existing `OrderNotes` component + fetches `order_notes` from DB

Props: `order` (the `OrderShipment` type), `userRole`, `open/onOpenChange`, `onUpdate`

### 3. Update LogisticsDashboard.tsx

- Remove `selectedOrderForDetails` state and the `OrderDetailsModal` usage
- Remove the two-button pattern per shipment
- Keep `selectedShipment` state — clicking a card sets it
- Replace `ShipmentDetailsDialog` + `OrderDetailsModal` with the single `ShipmentDetailModal`
- Improve the empty state with better visual
- Ensure responsive: on mobile, cards stack full-width with appropriate touch targets (min 44px)

### 4. Responsive improvements across all layouts

- Shipment cards: single column on mobile, 2-column on `md+`
- KPI grid: already responsive (2-col mobile, 4-col desktop) — keep
- Modal: full-width on mobile (`w-[95vw]`), max-w-2xl on desktop
- Tab bar: already scrollable — keep

## Files Changed

| File | Change |
|------|--------|
| `src/components/order/ShipmentDetailModal.tsx` | **New** — Unified 3-tab modal (order details + shipment + notes) |
| `src/pages/LogisticsDashboard.tsx` | Replace shipment item rendering with new card design; replace dual-modal with single `ShipmentDetailModal`; remove `selectedOrderForDetails` state |

