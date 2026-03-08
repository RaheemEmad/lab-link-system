

# Plan: Show Notes in Order Details Modal + Import Feature for Order Creation

## 1. Show Notes in OrderDetailsModal

**File: `src/components/order/OrderDetailsModal.tsx`**

- Add `handling_instructions` and `approval_notes` to the interface (already exist on the orders table)
- Add a new "Notes" section after the Shade section that conditionally renders:
  - **Biological Notes** (already shown, keep as-is)
  - **Handling Instructions** — shown with a yellow/warning styled card
  - **Approval Notes** — shown if present
- Also fetch and display `order_notes` (the internal notes from the `order_notes` table) below the static notes
  - Accept an optional `notes` prop (array of `{note_text, created_at, profiles: {full_name}}`)
  - Or fetch them inside the modal using the order `id`
- Best approach: fetch notes inside the modal component using `useEffect` + `supabase` query on `order_notes` table joined with `profiles`, since the modal already has the order `id`

**File: `src/pages/LogisticsDashboard.tsx`**
- Add `handling_instructions` and `approval_notes` to the `OrderShipment` interface (handling_instructions already there, add approval_notes)
- Add `approval_notes` to the select query

**File: `src/components/admin/AdminOrdersTab.tsx`**
- Already selects `*` so all fields are available; just need to add `handling_instructions` and `approval_notes` to the interface

## 2. Auto-Import Feature on Create Order Page

**File: `src/components/OrderForm.tsx`**

- Add an "Import Order Details" button at the top of the form (before the fields)
- On click, show a dialog/popover that accepts:
  - **Text paste** — user pastes a prescription or order text
  - **Photo upload** — user uploads a photo of a prescription/order slip
- Use Lovable AI (Gemini 2.5 Flash) via an edge function to extract structured data from the pasted text or uploaded image
- The AI returns JSON with fields: `patientName`, `restorationType`, `teethNumber`, `teethShade`, `biologicalNotes`, `handlingInstructions`, `urgency`
- Auto-fill the form fields with extracted values
- Show a toast confirming what was extracted, user can review and edit before submitting

**New Edge Function: `supabase/functions/extract-order-details/index.ts`**
- Accepts `{ text?: string, imageBase64?: string }` in body
- Calls Gemini 2.5 Flash with a structured prompt asking to extract dental order fields
- Returns the extracted fields as JSON
- Validates and sanitizes the response

**New Component: `src/components/order/ImportOrderDialog.tsx`**
- Dialog with two tabs: "Paste Text" and "Upload Photo"
- Text tab: textarea for pasting prescription text
- Photo tab: file upload for prescription image (converts to base64)
- "Extract" button calls the edge function
- On success, calls a callback with extracted data to populate the form

## Files Changed

| File | Change |
|------|--------|
| `src/components/order/OrderDetailsModal.tsx` | Add `handling_instructions`, `approval_notes` to interface; fetch + render `order_notes`; add Notes section |
| `src/pages/LogisticsDashboard.tsx` | Add `approval_notes` to interface + query |
| `src/components/admin/AdminOrdersTab.tsx` | Add `handling_instructions`, `approval_notes` to interface |
| `src/components/order/ImportOrderDialog.tsx` | **New** — Dialog for text paste / photo upload import |
| `src/components/OrderForm.tsx` | Add Import button at top, integrate ImportOrderDialog callback to populate form |
| `supabase/functions/extract-order-details/index.ts` | **New** — Edge function using Gemini to extract order details from text/image |

