
# Implementation Plan: Fix Delivery Confirmation, Lab Pricing Setup & Invoice Search

## Summary of Issues Identified

### Issue 1: Delivery Confirmation Failure
**Error**: `new row for relation "invoice_line_items" violates check constraint "invoice_line_items_line_type_check"`

**Root Cause**: The `generate_invoice_for_order` database function uses `'agreed_fee'` as a `line_type` value (line 64), but the constraint only allows:
- `base_price`, `urgency_fee`, `rework`, `sla_penalty`, `sla_bonus`, `multi_unit`, `adjustment`

**Fix**: Add `'agreed_fee'` to the check constraint for `invoice_line_items.line_type`

---

### Issue 2: Lab Pricing Setup for Restoration Types
**Request**: Labs should be able to set standard prices for each crown/restoration type that will be used for all future orders.

**Current State**: 
- A `lab_pricing` table exists with columns: `lab_id`, `restoration_type`, `fixed_price`, `min_price`, `max_price`, `includes_rush`, `rush_surcharge_percent`
- The table is currently empty (no UI to populate it)
- `PricingRulesManagement.tsx` exists but is global admin-level, not lab-specific

**Solution**: 
1. Create a `LabPricingSetup` component for labs to manage their restoration type prices
2. Integrate it into the lab admin/dashboard area
3. Display the pricing on the Lab Profile page (visible to doctors)
4. Update invoice generation to use lab-specific pricing when available

---

### Issue 3: Invoice Search Not Working
**Problem**: The search in the Invoice Generator isn't finding orders.

**Root Cause Analysis**: 
- The query in `InvoiceGenerator.tsx` (lines 76-100) fetches orders that are:
  - `status = 'Delivered'`
  - `delivery_confirmed_at IS NOT NULL`
  - Not already having an invoice

If no orders match (e.g., none have been delivered or all delivered orders have invoices), the list shows "0 order(s) available".

**Additional Issue**: The search filter only applies to `order_number`, `patient_name`, and `doctor_name` - but if there are 0 eligible orders in the first place, search won't help.

---

## Implementation Details

### Part 1: Fix Line Type Constraint

**Migration SQL**:
```sql
-- Drop existing constraint and add 'agreed_fee' as allowed value
ALTER TABLE invoice_line_items 
DROP CONSTRAINT invoice_line_items_line_type_check;

ALTER TABLE invoice_line_items 
ADD CONSTRAINT invoice_line_items_line_type_check 
CHECK (line_type = ANY (ARRAY[
  'base_price', 
  'urgency_fee', 
  'rework', 
  'sla_penalty', 
  'sla_bonus', 
  'multi_unit', 
  'adjustment',
  'agreed_fee'
]));
```

---

### Part 2: Lab Pricing Setup Component

#### New Component: `src/components/billing/LabPricingSetup.tsx`

Features:
- Table listing all restoration types with price inputs
- Fixed price per unit (crown/tooth)
- Optional rush surcharge percentage
- Save/update prices to `lab_pricing` table
- Visible only to lab_staff and admin

**UI Preview**:
```text
+--------------------------------------------------+
| Lab Pricing Setup                                |
+--------------------------------------------------+
| Restoration Type  | Price/Unit | Rush Surcharge  |
+-------------------+------------+------------------+
| Zirconia          | EGP 150    | 25%             |
| E-max             | EGP 180    | 25%             |
| PFM               | EGP 120    | 25%             |
| Acrylic           | EGP 80     | 25%             |
| Zirconia Layer    | EGP 170    | 25%             |
| Zirco-Max         | EGP 190    | 25%             |
+-------------------+------------+------------------+
| [Save Prices]                                    |
+--------------------------------------------------+
```

#### Integration Points:
1. **Lab Admin Page** (`src/pages/LabAdmin.tsx`): Add "Pricing" tab with `LabPricingSetup`
2. **Lab Profile** (`src/pages/LabProfile.tsx`): Display pricing table (read-only for doctors)
3. **BillingTab**: Add link to lab pricing setup for lab staff

---

### Part 3: Display Lab Pricing on Lab Profile

Add a new card section to `src/pages/LabProfile.tsx`:

```text
+--------------------------------------------------+
| Pricing                                           |
+--------------------------------------------------+
| Restoration Type  | Price/Unit                    |
+-------------------+-------------------------------+
| Zirconia          | EGP 150                       |
| E-max             | EGP 180                       |
| PFM               | EGP 120                       |
+-------------------+-------------------------------+
| * Rush orders: +25% surcharge                    |
+--------------------------------------------------+
```

---

### Part 4: Fix Invoice Generator Search

Improvements:
1. Add logging to help debug when orders aren't found
2. Show clearer messages when no orders are eligible (e.g., "No delivered orders awaiting invoices")
3. Ensure the query doesn't silently fail on RLS issues

---

### Part 5: Update Invoice Generation to Use Lab Pricing

Modify `generate_invoice_for_order` function to:
1. First check if the lab has pricing set in `lab_pricing` table
2. If lab-specific pricing exists, use it instead of global `pricing_rules`
3. Fall back to global pricing if no lab-specific pricing is set

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/billing/LabPricingSetup.tsx` | UI for labs to configure their restoration prices |

## Files to Modify

| File | Changes |
|------|---------|
| Migration SQL | Add 'agreed_fee' to line_type constraint |
| Migration SQL | Update `generate_invoice_for_order` function to use lab_pricing |
| `src/pages/LabAdmin.tsx` | Add Pricing tab with LabPricingSetup |
| `src/pages/LabProfile.tsx` | Display lab pricing table for doctors |
| `src/components/billing/InvoiceGenerator.tsx` | Improve error messaging for empty results |
| `src/components/billing/BillingTab.tsx` | Add link to lab pricing setup |

---

## Database Changes

### 1. Fix Check Constraint
```sql
ALTER TABLE invoice_line_items 
DROP CONSTRAINT invoice_line_items_line_type_check;

ALTER TABLE invoice_line_items 
ADD CONSTRAINT invoice_line_items_line_type_check 
CHECK (line_type = ANY (ARRAY[
  'base_price', 'urgency_fee', 'rework', 'sla_penalty', 
  'sla_bonus', 'multi_unit', 'adjustment', 'agreed_fee'
]));
```

### 2. Update Invoice Generation Function
The `generate_invoice_for_order` function will be updated to:
```sql
-- Priority order for pricing:
-- 1. agreed_fee (negotiated price from bid)
-- 2. lab_pricing (lab-specific prices)
-- 3. pricing_rules (global default prices)
```

---

## Technical Flow: Lab Pricing Usage

```text
Order Created
     |
     v
Lab Accepts / Bid Agreed
     |
     v
Delivery Confirmed
     |
     v
Generate Invoice
     |
     +-- Check agreed_fee? --> Use agreed_fee
     |
     +-- No agreed_fee? --> Check lab_pricing for lab + restoration_type
     |                           |
     |                           +-- Found? --> Use lab price
     |                           |
     |                           +-- Not found? --> Use global pricing_rules
     |
     v
Invoice Created with correct line items
```

---

## Expected Outcomes

1. **Delivery confirmation** will work without constraint violations
2. **Labs can set their prices** per restoration type in their admin area
3. **Doctors can see lab prices** on the lab profile before placing orders
4. **Invoice generation** uses lab-specific pricing when available
5. **Search in billing** shows clearer feedback when no orders are eligible
