

# Fix: Pricing Validation Error, Invoice Type Mismatch, and Lab Profile Visibility

## Issues Identified

### 1. "Failed to confirm delivery — operator doesn't exist: text = restoration_type"
**Root cause**: The `generate_invoice_for_order` function compares a `text` variable (`v_restoration_type_text`) against `pricing_rules.restoration_type` which is an **enum** column. Postgres cannot implicitly compare `text = restoration_type_enum`. The `lab_pricing.restoration_type` comparison works because that column is `text`.

**Fix**: Cast `pr.restoration_type` to text in the comparison, or cast the text variable to the enum. Safest approach: cast the enum column to text.

### 2. "Cannot assign order to lab without configured pricing" — poor error handling
**Root cause**: A database trigger (`validate_lab_pricing_on_order`) raises a raw exception. The client-side code catches this but shows the raw Postgres error message with no guidance.

**Fix**: 
- Add a client-side pre-check before assignment attempts (in `LabRequestsManagement.tsx` and `OrdersMarketplace.tsx`)
- Show a user-friendly error with actionable guidance
- Disable the "Accept" button for labs without `pricing_mode`

### 3. "Labs not found" when tapping a lab card as a doctor
**Root cause**: The `LabProfile` page queries `labs` with `.maybeSingle()`. The RLS policy only allows `SELECT` where `is_active = true`. If a lab somehow becomes inactive between the listing and the click, or if there's a query error, the page shows "Lab not found." Additionally, if the user is not authenticated, the RLS `RESTRICTIVE` policies all fail (no policy matches), returning nothing.

**Fix**: Make the error state more informative (distinguish "not found" from "authentication issue"). Add a fallback that checks if the user is logged in before showing the error.

---

## Implementation Plan

### Migration: Fix `generate_invoice_for_order` type mismatch
```sql
-- Fix: cast pricing_rules.restoration_type enum to text for comparison
CREATE OR REPLACE FUNCTION generate_invoice_for_order(...)
-- Change line: AND pr.restoration_type = v_restoration_type_text
-- To:         AND pr.restoration_type::text = v_restoration_type_text
```

### File: `src/pages/LabRequestsManagement.tsx`
- Before accepting a lab application, pre-check `labs.pricing_mode IS NOT NULL`
- If null, show toast: "[Lab Name] has not configured pricing yet. Ask them to set up pricing in Lab Admin."
- Add visual warning badge on application cards for labs without pricing
- Disable "Accept" button for labs without `pricing_mode`

### File: `src/pages/OrdersMarketplace.tsx`
- Same pre-check for admin override assignment

### File: `src/pages/LabProfile.tsx`
- Improve error state to check if user is authenticated
- If not authenticated, show "Please sign in to view lab profiles" instead of "Lab not found"
- Add error boundary around the query to prevent session disruption

### Files to modify
| File | Change |
|---|---|
| Migration SQL | Fix `restoration_type` enum-to-text cast in `generate_invoice_for_order` |
| `src/pages/LabRequestsManagement.tsx` | Pre-check pricing, disable accept for unconfigured labs, show warning |
| `src/pages/OrdersMarketplace.tsx` | Pre-check pricing on admin override |
| `src/pages/LabProfile.tsx` | Better error states, auth-aware "not found" handling |

