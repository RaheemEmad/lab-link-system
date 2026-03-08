

# Plan: Enhance OrderQuickView with Full Actions & Auto-Close

## Problem
The OrderQuickView sheet only has "Open Chat" and "Edit Order" buttons. Missing: View History, View Notes, Delete Order, Feedback Room. Also, tapping an action that navigates away doesn't auto-close the sheet.

## Solution

### File: `src/components/dashboard/OrderQuickView.tsx`

**1. Add new action callbacks to props:**
- `onViewHistory(order)`, `onViewNotes(order)`, `onDeleteOrder(orderId)` — these trigger the existing dialog handlers in `OrderDashboard`

**2. Add action buttons (staggered with framer-motion):**
- Open Chat (existing, if assigned lab)
- View Notes (`StickyNote` icon)
- View History (`Clock` icon)
- Feedback Room (`MessageSquare` icon → navigates to `/feedback-room?orderId=...`)
- Edit Order (existing)
- Delete Order (`Trash2` icon, destructive variant) — doctors only

**3. Auto-close on every action:**
- Create a helper `handleAction(callback)` that calls `onClose()` first, then runs the callback after a short delay (200ms) so the sheet animates out before the next dialog/page opens
- For navigation actions (Edit, Feedback Room, Lab profile), close then `navigate()`

### File: `src/components/OrderDashboard.tsx`

**4. Pass new handlers to `<OrderQuickView>`:**
- `onViewHistory={handleViewHistory}`
- `onViewNotes={handleViewNotes}`  
- `onDeleteOrder={(id) => setDeleteOrderId(id)}`

## Files Changed
| File | Change |
|------|--------|
| `src/components/dashboard/OrderQuickView.tsx` | Add 4 new action buttons, auto-close behavior, framer-motion stagger |
| `src/components/OrderDashboard.tsx` | Pass 3 new callback props to QuickView |

