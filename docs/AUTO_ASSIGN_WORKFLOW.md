# Auto-Assign Orders Marketplace - Technical Documentation

## Overview
This document describes the complete Auto-Assign order workflow, which allows doctors to submit orders to a marketplace where labs can apply to work on them.

## Architecture

### Core Concept: Decoupled Order Creation and Lab Assignment

**Orders exist in two states:**
1. **Marketplace State**: `auto_assign_pending = true`, `assigned_lab_id = null`
2. **Assigned State**: `auto_assign_pending = false`, `assigned_lab_id = <lab_id>`

**Critical Rule**: Orders NEVER appear in lab dashboards until doctor accepts a lab application.

---

## Complete Workflow

### 1. Doctor Submits Order (Auto-Assign)

**Frontend**: `src/components/OrderForm.tsx`
```typescript
// When doctor doesn't select a lab (auto-assign)
assigned_lab_id: null
auto_assign_pending: true
```

**Backend**: `supabase/functions/create-order/index.ts`
- Order saved with `auto_assign_pending = true`
- Order saved with `assigned_lab_id = null`
- Trigger fires: `notify_labs_marketplace_order`

**Database Trigger**: `notify_labs_marketplace_order_trigger`
```sql
-- Sends minimal notification to ALL lab_staff
INSERT INTO notifications (user_id, order_id, type, title, message)
VALUES (
  lab_staff_user.user_id,
  NEW.id,
  'new_marketplace_order',
  'New Order in Marketplace',
  'Dr. ' || NEW.doctor_name || ' submitted a new order. View in Marketplace to apply.'
);
```

**What happens:**
- ✅ Order appears in `/orders-marketplace` for all eligible labs
- ✅ Minimal notification sent (text only, no sensitive data)
- ❌ Order does NOT appear in any lab dashboard
- ❌ No lab assignment created
- ❌ No full order details exposed

---

### 2. Lab Views Marketplace

**Page**: `src/pages/OrdersMarketplace.tsx`

**Query Logic**:
```typescript
// Fetch orders with:
.eq("auto_assign_pending", true)
.is("assigned_lab_id", null)

// Then filter out refused orders for this lab
const refusedOrderIds = await getRefusedOrders(labId);
return ordersData.filter(order => !refusedOrderIds.has(order.id));
```

**What labs see:**
- Patient initials (e.g., "J.D.")
- Order number
- Restoration type
- Doctor name
- Urgency level
- Notes preview (biological_notes)
- "Apply to this Order" button

**What labs DON'T see:**
- Full patient name
- Photos link
- Design files
- Full order details
- QC checklist

**Eligibility Rules:**
1. **New labs** (no prior relationship): See order in marketplace, can apply
2. **Approved labs** (prior relationship): See order in marketplace, can apply
3. **Rejected labs** (refused for this order): Cannot see order, cannot reapply

---

### 3. Lab Applies to Order

**Frontend**: `src/pages/OrdersMarketplace.tsx`
```typescript
// When lab clicks "Apply to this Order"
await supabase
  .from("lab_work_requests")
  .insert({
    order_id: orderId,
    lab_id: labId,
    requested_by_user_id: user.id,
    status: 'pending'
  });
```

**Database Trigger**: `notify_doctor_on_lab_request`
```sql
-- Sends minimal notification to doctor
INSERT INTO notifications (user_id, order_id, type, title, message)
VALUES (
  doctor_id,
  NEW.order_id,
  'lab_request',
  'New Lab Application',
  lab_name || ' applied to work on order ' || order_number || '. Review application in Lab Applications.'
);
```

**Audit**: Records application in `lab_application_audit` table

**What happens:**
- ✅ Request record created with status 'pending'
- ✅ Doctor notified of application
- ❌ Lab does NOT get access to full order details yet
- ❌ Order does NOT move to lab dashboard yet

---

### 4. Doctor Reviews Applications

**Page**: `src/pages/LabRequestsManagement.tsx`

**Doctor sees:**
- Lab name, logo, rating
- Lab specialties
- Average turnaround time
- Lab location
- Lab description
- "View Full Profile" modal
- Accept / Reject buttons

**Actions:**
1. **Accept**: Assigns order to lab, unlocks full details
2. **Reject**: Removes order from lab's marketplace permanently

---

### 5. Doctor Accepts Application

**Database Trigger**: `notify_lab_on_request_status` (ATOMIC)

```sql
-- When status changes to 'accepted', atomically:
BEGIN;
  -- 1. Assign lab to order
  UPDATE orders
  SET assigned_lab_id = NEW.lab_id,
      auto_assign_pending = FALSE
  WHERE id = NEW.order_id;
  
  -- 2. Create order assignments for all lab staff
  INSERT INTO order_assignments (order_id, user_id, assigned_by)
  SELECT NEW.order_id, user_id, auth.uid()
  FROM user_roles
  WHERE lab_id = NEW.lab_id AND role = 'lab_staff';
  
  -- 3. Reject all other pending requests
  UPDATE lab_work_requests
  SET status = 'refused'
  WHERE order_id = NEW.order_id
  AND id != NEW.id
  AND status = 'pending';
  
  -- 4. Notify accepted lab
  INSERT INTO notifications (user_id, order_id, type, title, message)
  VALUES (
    lab_staff_user.user_id,
    NEW.order_id,
    'request_accepted',
    'Order Unlocked: ' || order_number,
    'You can now view full details and start working on this order.'
  );
  
  -- 5. Notify rejected labs
  INSERT INTO notifications (user_id, order_id, type, title, message)
  VALUES (
    rejected_lab_staff.user_id,
    NEW.order_id,
    'request_refused',
    'Order No Longer Available',
    'This order has been assigned to another lab.'
  );
COMMIT;
```

**What happens:**
- ✅ Order appears in accepted lab's dashboard
- ✅ Full order details unlocked for accepted lab
- ✅ Order removed from all other labs' marketplace
- ✅ Rejected labs cannot reapply
- ✅ All changes are atomic (no race conditions)

---

### 6. Doctor Rejects Application

**Database Trigger**: `notify_lab_on_request_status`

```sql
-- When status changes to 'refused':
INSERT INTO notifications (user_id, order_id, type, title, message)
VALUES (
  lab_staff_user.user_id,
  NEW.order_id,
  'request_refused',
  'Application Not Approved: ' || order_number,
  'Your application to work on this order was not approved.'
);
```

**Constraint**: `prevent_reapplication` trigger prevents rejected labs from reapplying

**What happens:**
- ✅ Order removed from rejected lab's marketplace
- ✅ Rejected lab cannot reapply
- ✅ Order remains in marketplace for other labs
- ❌ No dashboard access for rejected lab

---

## Notification Routing

**File**: `src/pages/NotificationHistory.tsx`

```typescript
const handleNotificationClick = (notification) => {
  if (notification.type === 'new_marketplace_order') {
    navigate('/orders-marketplace');  // ✅ Opens marketplace
  } else if (notification.type === 'lab_request') {
    navigate('/lab-requests');  // ✅ Opens lab requests page
  } else {
    navigate(`/dashboard?orderId=${notification.order_id}`);  // ✅ Opens dashboard
  }
};
```

**Notification Types:**
- `new_marketplace_order` → Navigate to `/orders-marketplace`
- `lab_request` → Navigate to `/lab-requests`
- `request_accepted` → Navigate to `/dashboard`
- `request_refused` → Navigate to `/dashboard`
- `status_change` → Navigate to `/dashboard`
- `new_note` → Navigate to `/dashboard`

---

## Row-Level Security (RLS) Policies

### Orders Table

**Lab Staff - Marketplace View**:
```sql
CREATE POLICY "Lab staff can view marketplace orders only"
ON orders FOR SELECT
USING (
  auto_assign_pending = true
  AND assigned_lab_id IS NULL
  AND has_role(auth.uid(), 'lab_staff')
  AND NOT lab_was_refused_for_order(id, auth.uid())
);
```

**Lab Staff - Assigned Orders View**:
```sql
CREATE POLICY "Labs can view assigned orders only"
ON orders FOR SELECT
USING (
  auth.uid() = doctor_id
  OR has_role(auth.uid(), 'admin')
  OR (
    assigned_lab_id IS NOT NULL
    AND has_role(auth.uid(), 'lab_staff')
    AND EXISTS (
      SELECT 1 FROM order_assignments
      WHERE order_id = orders.id
      AND user_id = auth.uid()
    )
  )
);
```

### Lab Work Requests Table

**Lab Staff - Create Requests**:
```sql
CREATE POLICY "Lab staff can create requests"
ON lab_work_requests FOR INSERT
WITH CHECK (
  auth.uid() = requested_by_user_id
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'
    AND lab_id = lab_work_requests.lab_id
  )
);
```

---

## Dashboard Query Logic

**File**: `src/components/OrderDashboard.tsx`

```typescript
// Lab staff: Only show ASSIGNED orders (not marketplace orders)
let query = supabase.from("orders").select("*");

if (userRole === 'lab_staff') {
  query = query.not('assigned_lab_id', 'is', null);  // ✅ Filters out marketplace orders
}

const { data } = await query.order("timestamp", { ascending: false });
```

**Critical**: This prevents marketplace orders from appearing in lab dashboards.

---

## Security Audit Trail

All application actions are logged in `lab_application_audit`:

```sql
CREATE TABLE lab_application_audit (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  lab_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,  -- 'applied', 'accepted', 'rejected'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

**Logged Actions:**
- Lab applies → `action: 'applied'`
- Doctor accepts → `action: 'accepted'`
- Doctor rejects → `action: 'rejected'`

---

## Edge Cases & Constraints

### 1. Rejected Labs Cannot Reapply

**Trigger**: `prevent_reapplication`
```sql
CREATE TRIGGER prevent_reapplication_trigger
BEFORE INSERT ON lab_work_requests
FOR EACH ROW
EXECUTE FUNCTION prevent_reapplication();
```

**Function**:
```sql
CREATE FUNCTION prevent_reapplication() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM lab_work_requests
    WHERE order_id = NEW.order_id
    AND lab_id = NEW.lab_id
    AND status = 'refused'
  ) THEN
    RAISE EXCEPTION 'This lab has already been refused for this order and cannot reapply';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Only One Lab Accepted Per Order

**Atomic operation** in `notify_lab_on_request_status` ensures:
- Order assignment
- Other requests rejection
- All happen in single transaction

### 3. Lab Staff Without lab_id

**Scenario**: Lab staff user exists but `user_roles.lab_id` is `null`

**Behavior**:
- Can view marketplace orders
- Cannot apply (no lab to represent)
- Warning message displayed: "You are not currently assigned to a lab"

**Fix**: Admin must update `user_roles.lab_id` for the lab staff user

---

## QA / Verification Plan

### Test Scenario 1: New Lab Application Flow
1. Doctor submits auto-assign order
2. ✅ Order appears in marketplace
3. ✅ Lab receives notification
4. ✅ Clicking notification opens marketplace
5. ✅ Order does NOT appear in lab dashboard
6. Lab clicks "Apply"
7. ✅ Request created with status 'pending'
8. ✅ Doctor receives notification
9. Doctor accepts
10. ✅ Order appears in lab dashboard
11. ✅ Full details unlocked
12. ✅ Order removed from marketplace
13. ✅ Order removed from other labs' marketplace

### Test Scenario 2: Rejected Lab Cannot Reapply
1. Lab applies to order
2. Doctor rejects
3. ✅ Order removed from rejected lab's marketplace
4. ✅ Lab attempts to reapply → Error: "cannot reapply"
5. ✅ Order still visible to other labs

### Test Scenario 3: Multiple Labs Apply
1. Lab A, Lab B, Lab C apply to same order
2. Doctor accepts Lab B
3. ✅ Order assigned to Lab B
4. ✅ Lab A request status → 'refused'
5. ✅ Lab C request status → 'refused'
6. ✅ Lab B gets full access
7. ✅ Lab A and C get notification: "Order No Longer Available"
8. ✅ Order removed from Lab A and C marketplace

### Test Scenario 4: Notification Routing
1. Lab receives `new_marketplace_order` notification
2. ✅ Click opens `/orders-marketplace`
3. Doctor receives `lab_request` notification
4. ✅ Click opens `/lab-requests`
5. Lab receives `request_accepted` notification
6. ✅ Click opens `/dashboard`

### Test Scenario 5: Unauthorized Access Prevention
1. Lab without lab_id tries to view marketplace
2. ✅ Can view orders
3. ✅ Warning message displayed
4. Lab tries to apply
5. ❌ Application fails (no lab_id)

---

## Common Issues & Solutions

### Issue 1: Marketplace shows "No available orders"

**Causes:**
- Lab staff user has `lab_id = null`
- All marketplace orders have been refused by this lab
- No auto-assign orders exist

**Solution:**
- Check `user_roles.lab_id` for lab staff
- Check `lab_work_requests` for refused orders
- Verify `orders.auto_assign_pending = true`

### Issue 2: Orders appearing in lab dashboard prematurely

**Cause:** Dashboard query not filtering by `assigned_lab_id`

**Solution:**
```typescript
if (userRole === 'lab_staff') {
  query = query.not('assigned_lab_id', 'is', null);
}
```

### Issue 3: Notification clicks open dashboard instead of marketplace

**Cause:** Notification handler not routing by type

**Solution:**
```typescript
if (notification.type === 'new_marketplace_order') {
  navigate('/orders-marketplace');
}
```

---

## Files Modified

1. `src/pages/NotificationHistory.tsx` - Notification routing logic
2. `src/pages/OrdersMarketplace.tsx` - Marketplace query and warnings
3. `src/components/OrderDashboard.tsx` - Dashboard filtering
4. `supabase/functions/create-order/index.ts` - Auto-assign flag
5. Database migrations - Triggers and policies

---

## API Endpoints Summary

**No API endpoints required** - All logic handled via:
- Supabase RLS policies
- Database triggers
- Client-side queries

---

## Monitoring & Debugging

**Check marketplace orders:**
```sql
SELECT id, order_number, auto_assign_pending, assigned_lab_id
FROM orders
WHERE auto_assign_pending = true;
```

**Check lab applications:**
```sql
SELECT lwr.*, l.name as lab_name, o.order_number
FROM lab_work_requests lwr
JOIN labs l ON l.id = lwr.lab_id
JOIN orders o ON o.id = lwr.order_id
ORDER BY lwr.created_at DESC;
```

**Check audit trail:**
```sql
SELECT * FROM lab_application_audit
ORDER BY created_at DESC;
```

**Check refused labs:**
```sql
SELECT order_id, lab_id, status
FROM lab_work_requests
WHERE status = 'refused';
```

---

## Performance Considerations

1. **Marketplace query** includes refused orders check - consider indexing `lab_work_requests(lab_id, status)`
2. **Realtime subscriptions** on orders table - ensure proper connection cleanup
3. **Atomic transactions** in `notify_lab_on_request_status` - monitor for deadlocks

---

## Security Checklist

- ✅ RLS policies prevent unauthorized access
- ✅ Lab staff cannot see orders before acceptance
- ✅ Rejected labs cannot reapply
- ✅ Only one lab can be assigned per order
- ✅ Notifications contain minimal data
- ✅ Audit trail for all actions
- ✅ Atomic operations prevent race conditions
- ✅ Security definer functions prevent RLS recursion

---

## Conclusion

The Auto-Assign marketplace is fully decoupled from lab assignment. Orders flow through:

**Marketplace → Application → Approval → Dashboard**

No shortcuts, no bypasses, no premature access.
