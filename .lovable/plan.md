

# Plan: Patient Cases Layout + Doctor Edit Order Enhancement

## 1. Patient Cases Page — Add Back Button + Use PageLayout

**Current state**: PatientCases.tsx manually renders `LandingNav`, `LandingFooter`, `ScrollToTop`. No back button.

**Change**: Add a "Back to Dashboard" button at top (like EditOrder has), and use the existing `PageLayout` component for consistency.

**File**: `src/pages/PatientCases.tsx`

---

## 2. Doctor Edit Order — Full Parity with New Order Form

**Current state**: EditOrder.tsx is missing several fields that exist in the `OrderForm` (New Order) creation flow:
- `handlingInstructions` — text field for special handling notes
- `desiredDeliveryDate` — date picker for requested delivery
- `targetBudget` + `budgetNotes` — budget section
- File/photo uploads — OrderForm supports drag-and-drop image uploads; EditOrder has none

**Also missing UX enhancements**:
- No order number display in the header
- No order status badge shown
- No "changes summary" before save
- No section grouping (all fields in a flat list)
- Doctor name field should be read-only for doctors (auto-populated)

### Changes to `src/pages/EditOrder.tsx`:

1. **Add missing form fields** to schema and UI:
   - `handlingInstructions` (textarea)
   - `desiredDeliveryDate` (date picker with Calendar popover, same as OrderForm)
   - `targetBudget` (number input) + `budgetNotes` (textarea) via `BudgetSection` component
   
2. **Add file management section**: Show existing order attachments with ability to view them (link to OrderAttachmentsHub or inline list). Photo upload for adding new files.

3. **UI/UX improvements**:
   - Show order number + status badge in the card header
   - Group fields into logical sections with separators: "Patient Info", "Restoration Details", "Delivery & Budget", "Additional Notes"
   - Make `doctorName` read-only for doctor role (they can't change their own name)
   - Add a "Changes Summary" collapsible section that shows what was modified before submitting
   - Improve the back button with breadcrumb-style context
   - Add a "Reset to Original" button alongside Cancel/Save

4. **Map new fields to DB columns** in fetch and submit:
   - `desired_delivery_date` ↔ `desiredDeliveryDate`
   - `handling_instructions` ↔ `handlingInstructions`  
   - `target_budget` ↔ `targetBudget`
   - `budget_notes` ↔ `budgetNotes`

---

## 3. Doctor Edit Access from Dashboard

**Current state**: The "Edit Order" dropdown item in `OrderDashboard.tsx` is shown for ALL roles (line 932). There's no restriction — both doctors and labs see it. This is actually correct per the plan requirements, but we should ensure:
- Doctors can edit all fields (patient info, restoration, delivery, budget)
- Lab staff can only edit lab-relevant fields (status is handled separately, but they may edit handling instructions, notes)

The existing `EditOrder.tsx` already role-checks and hides lab selector for lab_staff. This is sufficient.

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `src/pages/PatientCases.tsx` — add back button, use PageLayout |
| Major Modify | `src/pages/EditOrder.tsx` — add missing fields, section grouping, UX improvements |

