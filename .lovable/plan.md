

# Order Mode Chooser + Quick Order + Save as Template

## Current State
- `OrderForm.tsx` is already a 3-step multi-step wizard (Patient & Teeth → Restoration & Shade → Lab & Delivery)
- `order_templates` table already exists in DB with RLS policies
- `OrderTemplateSelector` component already provides template pre-fill on the New Order form
- `multi-step-form.tsx` exists but is NOT used by OrderForm (OrderForm has its own step logic)

## What to Build

### 1. Order Mode Chooser (on NewOrder page)
Before showing any form, present the doctor with 3 mode cards:
- **Detailed Order** (current wizard) — "Step-by-step guided form with all options"
- **Quick Order** — "Just 3 fields: patient, restoration type, teeth. Submit in seconds."
- **From Template** — "Pick a saved template and submit instantly" (opens template selector then pre-fills wizard)

Store the doctor's last-used mode preference in `localStorage` so it remembers.

### 2. Quick Order Form (new component)
`src/components/order/QuickOrderForm.tsx`
- 3 fields only: Patient Name, Restoration Type, Teeth Number
- Auto-fills Doctor Name from profile (same as current form)
- Defaults: shadeSystem="VITA Classical", urgency="Normal", teethShade="A2"
- Single-page, no steps, minimal UI
- Submits via same `create-order` edge function
- Shows success card same as current form
- Link at bottom: "Need more options? Switch to detailed form"

### 3. Save as Template (on success screen)
After successful order submission (in both Quick and Detailed modes), add a "Save as Template" button below the success card. On click:
- Opens a small dialog asking for template name
- Inserts into `order_templates` table with the submitted form values
- Uses existing table — no migration needed

### 4. Templates Library Page
`src/pages/TemplatesLibrary.tsx`
- Lists all templates for the current doctor
- Shows name, restoration type, teeth, shade, favorite status
- Actions: Use (navigates to `/new-order?fromTemplate=<id>`), Delete, Toggle Favorite
- Route: `/templates`

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/order/QuickOrderForm.tsx` | Minimal 3-field order form |
| `src/components/order/OrderModeChooser.tsx` | Card picker for Detailed / Quick / Template modes |
| `src/components/order/SaveAsTemplateDialog.tsx` | Post-submit save-as-template dialog |
| `src/pages/TemplatesLibrary.tsx` | Template management page |

## Files to Modify
| File | Change |
|------|---------|
| `src/pages/NewOrder.tsx` | Add mode chooser before form, conditionally render QuickOrderForm or OrderForm |
| `src/components/OrderForm.tsx` | Add SaveAsTemplateDialog to success screen |
| `src/App.tsx` | Add `/templates` route |

## No DB Changes Needed
The `order_templates` table already exists with all required columns (name, restoration_type, teeth_shade, shade_system, teeth_number, biological_notes, urgency, handling_instructions, assigned_lab_id, is_favorite, use_count, user_id).

## UX Flow
```text
NewOrder page
  ├─ [First visit] → OrderModeChooser
  │     ├─ "Detailed Order" → existing OrderForm (wizard)
  │     ├─ "Quick Order" → QuickOrderForm (3 fields)
  │     └─ "From Template" → template picker → pre-filled OrderForm
  │
  └─ [After submit - either mode] → Success card + "Save as Template" button
```

## Role Guard
- Only doctors see mode chooser (same existing guard in NewOrder.tsx)
- Quick Order uses same `create-order` edge function — no new backend needed
- Templates table already has `user_id = auth.uid()` RLS — secure by default

