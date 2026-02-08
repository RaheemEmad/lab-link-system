
# Implementation Plan: Invoice Dispute Resolution, Doctor Invoice Requests, and Bug Fixes

## Summary of Issues Identified

### Issue 1: Delivery Confirmation Still Failing
**Error**: `new row for relation "invoice_line_items" violates check constraint "invoice_line_items_source_event_check"`

**Root Cause**: The `generate_invoice_for_order` function uses `'order_delivery'` as the `source_event` value (line 108 of the function), but the constraint only allows:
- `'order_created'`, `'lab_accepted'`, `'delivery_confirmed'`, `'feedback_approved'`, `'admin_override'`, `'rework_detected'`, `'sla_calculation'`

**Fix**: Change the function to use `'delivery_confirmed'` instead of `'order_delivery'`.

---

### Issue 2: Disputed Invoice Flow Missing
**Current State**: 
- When a dispute is raised, the invoice status changes to `'disputed'` and is frozen
- There is NO `resolve_invoice_dispute` function
- There is NO way for admins to resolve disputes and revert the badge to normal

**Missing Features**:
- Dispute resolution workflow for admins
- Resolution actions: Accept (adjust invoice), Reject (dismiss dispute), or Dismiss (requires explanation)
- Status reversion after resolution
- Notification to disputing party

**Solution**: Create a complete dispute resolution workflow with:
- New `resolve_invoice_dispute` database function
- DisputeResolutionDialog component for admins
- Ability to apply adjustments as part of resolution
- Audit trail of resolution

---

### Issue 3: Doctors Cannot Request or Generate Invoices
**Current State**: 
- Only `admin` and `lab_staff` can generate invoices
- Doctors can only VIEW invoices for their orders
- No mechanism for doctors to request invoice generation

**Solution**:
1. Add "Request Invoice" button for doctors on delivered orders
2. Create `invoice_requests` table to track requests
3. Notify lab staff when doctor requests an invoice
4. Show pending requests in lab billing dashboard

---

### Issue 4: Invoice Detail Enhancement
**Current State**: Invoice preview shows basic order info and line items

**Enhancements Needed**:
- Show all timestamps (created, assigned, started, completed, delivered, confirmed)
- Show order history/status changes
- Show any notes or special instructions
- Display pricing source (agreed fee vs lab pricing vs template)
- Show who confirmed delivery

---

### Issue 5: Invoice Sorting and Monthly Bundling
**Current State**: Invoices are sorted by `created_at` descending only

**Solution**:
- Add sortable columns (date, amount, status, payment status)
- Add date range filter for creating bundled monthly views
- Enhance MonthlyBillingSummary to show grouped invoices

---

### Issue 6: Feedback Room Shows No Orders Initially
**Current State**: The `OrderSelector` component query has `enabled: !!user && !roleLoading && (isDoctor || isLabStaff)`

**Root Cause**: When role is still loading or role check returns false before data loads, the query doesn't run initially. The user sees "No Orders Available" which then refreshes correctly.

**Fix**: Ensure the loading state is shown until role is definitively confirmed, and only then show "No Orders" if truly empty.

---

### Issue 7: React Error #31 on Profile Page
**Error**: `Object with keys {role, lab_id}` rendered as React children

**Root Cause Analysis**: In Profile.tsx line 125-140, the `userRole` query fetches `{ role, lab_id }` from user_roles. Looking at the code, the issue is likely somewhere this object is accidentally rendered.

Looking at Profile.tsx lines 417-452:
```tsx
<Badge variant={userRole ? formatRole(userRole).variant : "default"}>
  {userRole ? formatRole(userRole).label : "Loading..."}
</Badge>
```

The `userRole` here is the result of the query which returns `{ role, lab_id }` object, NOT just the role string! The `formatRole()` function expects a string but receives an object.

**Fix**: Change to use `userRole?.role` instead of `userRole` when calling `formatRole()`.

---

### Issue 8: Invoice Status Tabs Inconsistency
**Current State**: The tabs use inline styles that can look inconsistent on different screens

**Fix**: Improve responsive layout and ensure consistent spacing/sizing across tabs.

---

## Database Changes

### 1. Fix `generate_invoice_for_order` Function
Update the `source_event` value from `'order_delivery'` to `'delivery_confirmed'`:

```sql
-- In the INSERT INTO invoice_line_items statement
source_event = 'delivery_confirmed'
-- Instead of 'order_delivery'
```

### 2. Create `resolve_invoice_dispute` Function
```sql
CREATE OR REPLACE FUNCTION resolve_invoice_dispute(
  p_invoice_id uuid,
  p_user_id uuid,
  p_resolution_action text,  -- 'accepted', 'rejected', 'adjusted'
  p_resolution_notes text DEFAULT NULL,
  p_adjustment_amount numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_previous_status text;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF v_invoice.status != 'disputed' THEN
    RAISE EXCEPTION 'Invoice is not in disputed status';
  END IF;
  
  -- Store previous status for reversion
  v_previous_status := COALESCE(
    (SELECT old_values->>'status' FROM billing_audit_log 
     WHERE invoice_id = p_invoice_id AND action = 'disputed' 
     ORDER BY created_at DESC LIMIT 1),
    'generated'
  );
  
  -- Handle adjustment if provided
  IF p_adjustment_amount IS NOT NULL AND p_adjustment_amount != 0 THEN
    INSERT INTO invoice_adjustments (
      invoice_id,
      adjustment_type,
      amount,
      reason,
      created_by
    ) VALUES (
      p_invoice_id,
      'dispute_resolution',
      p_adjustment_amount,
      p_resolution_notes,
      p_user_id
    );
    
    -- Update invoice totals
    UPDATE invoices SET
      adjustments_total = adjustments_total + p_adjustment_amount,
      final_total = subtotal + adjustments_total + p_adjustment_amount - expenses_total
    WHERE id = p_invoice_id;
  END IF;
  
  -- Update invoice status back to previous or locked
  UPDATE invoices SET
    status = v_previous_status,
    dispute_resolved_at = now(),
    dispute_resolved_by = p_user_id,
    updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Log the resolution
  INSERT INTO billing_audit_log (
    invoice_id, action, performed_by, 
    old_values, new_values, reason
  ) VALUES (
    p_invoice_id, 'dispute_resolved', p_user_id,
    jsonb_build_object('status', 'disputed'),
    jsonb_build_object(
      'status', v_previous_status,
      'resolution_action', p_resolution_action,
      'adjustment', p_adjustment_amount
    ),
    p_resolution_notes
  );
  
  RETURN true;
END;
$$;
```

### 3. Create `invoice_requests` Table
```sql
CREATE TABLE IF NOT EXISTS invoice_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) NOT NULL,
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  status text CHECK (status IN ('pending', 'generated', 'rejected')) DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can request invoices for their orders"
ON invoice_requests FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND doctor_id = auth.uid())
);

CREATE POLICY "Users can view their own requests"
ON invoice_requests FOR SELECT TO authenticated
USING (
  requested_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'lab_staff'::app_role)
);
```

---

## Component Changes

### 1. Fix Profile.tsx - React Error #31
**File**: `src/pages/Profile.tsx`

**Current code (line ~422)**:
```tsx
<Badge variant={userRole ? formatRole(userRole).variant : "default"}>
  {userRole ? formatRole(userRole).label : "Loading..."}
</Badge>
```

**Fixed code**:
```tsx
<Badge variant={userRole?.role ? formatRole(userRole.role).variant : "default"}>
  {userRole?.role ? formatRole(userRole.role).label : "Loading..."}
</Badge>
```

Also update line 427:
```tsx
{userRole?.role ? formatRole(userRole.role).description : "Fetching your role information..."}
```

---

### 2. New Component: DisputeResolutionDialog
**File**: `src/components/billing/DisputeResolutionDialog.tsx`

Features:
- View dispute reason
- Resolution options: Accept & Close, Reject & Close, Adjust & Close
- Optional adjustment amount field
- Resolution notes (required)
- Confirm dialog with impact explanation
- Triggers notification to disputing party

---

### 3. Update InvoicePreview.tsx for Dispute Resolution
Add dispute resolution button for admin when `status === 'disputed'`:

```tsx
{invoice.status === 'disputed' && role === 'admin' && (
  <Button onClick={() => setShowResolutionDialog(true)}>
    Resolve Dispute
  </Button>
)}
```

---

### 4. New Component: InvoiceRequestButton
**File**: `src/components/billing/InvoiceRequestButton.tsx`

For doctors to request invoice generation on their delivered orders:
- Shows on order detail page when order is delivered but no invoice exists
- Creates entry in `invoice_requests` table
- Shows confirmation with estimated processing time

---

### 5. Update BillingTab.tsx for Sorting
Add sorting controls:
- Sort by: Date Created, Amount, Status, Payment Status
- Sort direction: Ascending/Descending
- Persist preference in localStorage

---

### 6. Fix OrderSelector.tsx Loading State
**File**: `src/components/feedback-room/OrderSelector.tsx`

Current:
```tsx
const { data: orders, isLoading: ordersLoading } = useQuery({
  ...
  enabled: !!user && !roleLoading && (isDoctor || isLabStaff),
});
```

The problem is that `isDoctor` and `isLabStaff` return `false` during the loading phase.

Fixed:
```tsx
const { data: orders, isLoading: ordersLoading } = useQuery({
  ...
  enabled: !!user && roleConfirmed && (isDoctor || isLabStaff),
});

// Show loading while role is being determined
if (roleLoading || !roleConfirmed) {
  return <LoadingScreen message="Checking access..." />;
}
```

---

### 7. Enhanced Invoice Details
Update InvoicePreview.tsx to include:
- Order history timeline (status changes with timestamps)
- All order notes (biological, handling, approval)
- Pricing source indicator
- Delivery confirmation details (who confirmed, when)
- Lab information

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/billing/DisputeResolutionDialog.tsx` | Admin dialog to resolve disputed invoices |
| `src/components/billing/InvoiceRequestButton.tsx` | Doctor button to request invoice |
| `src/components/billing/InvoiceSortControls.tsx` | Sorting controls for invoice list |

## Files to Modify

| File | Changes |
|------|---------|
| Migration SQL | Fix source_event, create resolve function, create invoice_requests table |
| `src/pages/Profile.tsx` | Fix React Error #31 - use `userRole?.role` instead of `userRole` |
| `src/components/feedback-room/OrderSelector.tsx` | Use `roleConfirmed` flag for query enabling |
| `src/components/billing/InvoicePreview.tsx` | Add dispute resolution, enhance details |
| `src/components/billing/BillingTab.tsx` | Add sorting, show invoice requests for lab staff |
| `src/pages/Dashboard.tsx` | Add invoice request button for doctors on delivered orders |

---

## Dispute Resolution Workflow

```text
Invoice Disputed
      |
      v
Admin Reviews in Billing Tab
      |
      v
Admin Opens Resolution Dialog
      |
      +-- View dispute reason
      |
      +-- Choose resolution action:
      |     ├── "Accept" - Agree with dispute, optionally add adjustment
      |     ├── "Reject" - Dismiss dispute, no changes
      |     └── "Adjust" - Partial agreement, add credit/debit
      |
      +-- Enter resolution notes (required)
      |
      v
Confirm Resolution
      |
      v
Update Invoice:
  ├── status → previous status (generated/locked)
  ├── dispute_resolved_at → now()
  ├── dispute_resolved_by → admin id
  └── If adjustment: update adjustments_total and final_total
      |
      v
Notify disputing party
      |
      v
Log in audit trail
```

---

## Doctor Invoice Request Workflow

```text
Doctor views delivered order
      |
      v
Clicks "Request Invoice" button
      |
      v
Creates entry in invoice_requests
      |
      v
Notification sent to lab staff
      |
      v
Lab staff sees pending requests in Billing Tab
      |
      v
Lab staff generates invoice
      |
      v
Request marked as processed
      |
      v
Notification sent to doctor
```

---

## Expected Outcomes

1. Delivery confirmation will work without constraint violations
2. Disputed invoices can be resolved by admins with full audit trail
3. Doctors can request invoices for their delivered orders
4. Invoices show comprehensive order details and timestamps
5. Invoice list can be sorted by multiple criteria
6. Feedback Room loads correctly without needing refresh
7. Profile page works without React Error #31
8. Invoice tabs are consistently styled
