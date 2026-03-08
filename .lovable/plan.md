

# Plan: Redesign Shipment Tab — Display-First with Edit Toggle

## Problem
The Shipment tab currently renders all details as disabled form inputs for non-lab-staff, which looks like a broken form. Even for lab staff, it's a wall of form fields.

## New Design
Replace the form-first approach with a **display-first layout** using styled info cards. Lab staff gets an "Edit" button that toggles into inline edit mode.

### Shipment Tab Layout (when viewing)

Three visual sections using the same `DetailRow` pattern as the Order tab:

1. **Delivery Schedule card** — Shows desired date, proposed date, and date comment as styled rows with calendar icons
2. **Carrier & Driver card** — Shows carrier name/phone and driver name/WhatsApp as a 2-column grid of detail rows. WhatsApp number rendered as a tappable link (`https://wa.me/...`)
3. **Tracking card** — Tracking number (monospace, copyable), pickup time, current location, shipment notes

At the top-right of the tab: an "Edit" button (only visible for `lab_staff`). When clicked, the view swaps to the current form layout. A "Cancel" button returns to display mode.

### Empty State
If no shipment details exist at all, show a friendly empty state: "No shipment details yet" with an illustration icon. Lab staff sees "Add Shipment Details" button.

## File Changed

| File | Change |
|------|--------|
| `src/components/order/ShipmentDetailModal.tsx` | Add `isEditing` state. Shipment tab: render detail cards by default, swap to form on edit. Add Edit/Cancel toggle for lab_staff. Add WhatsApp link. |

