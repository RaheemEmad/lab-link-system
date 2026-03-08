

# Plan: Connect Scheduling with Order Delivery Dates

## What Changes

When a doctor selects an order in the "New Appointment" dialog, the system reads the order's delivery dates (`desired_delivery_date`, `proposed_delivery_date`, `expected_delivery_date`) and presents **quick-pick date buttons** so the doctor can instantly choose a relevant date without thinking.

## Changes to `src/components/logistics/SchedulingTabContent.tsx`

### 1. Expand the orders query (line 65)

Add `desired_delivery_date`, `proposed_delivery_date`, `expected_delivery_date`, `urgency`, `restoration_type`, `status` to the select so the component has access to order timeline data.

### 2. Add quick-pick date suggestions (after order selector, ~line 189)

When an order is selected and it has delivery dates, render a row of tappable chips/buttons:

- **Same as desired** — sets date to `desired_delivery_date`
- **Day before** — `desired_delivery_date - 1 day`
- **Day after** — `desired_delivery_date + 1 day`
- **Proposed date** — if `proposed_delivery_date` exists and differs
- **Custom** — keeps the calendar picker open (current behavior)

Each chip, when tapped, sets `selectedDate` immediately. The calendar still works for full custom selection. Chips that fall on unavailable lab days or past dates are disabled with a tooltip.

### 3. Show order context card (after order selector)

Display a small info card showing the selected order's key details:
- Patient name, restoration type, urgency badge
- Desired delivery date, proposed date (if set)
- Days remaining until desired delivery

This gives the doctor immediate context without leaving the dialog.

### 4. Auto-set appointment type based on order status

- If order status is "Ready for Delivery" → default type to "delivery"
- If order status is "Pending" or "In Progress" → default type to "pickup"

## Files Changed

| File | Change |
|------|--------|
| `src/components/logistics/SchedulingTabContent.tsx` | Expand order query fields; add quick-pick date chips; add order context card; auto-set appointment type |

