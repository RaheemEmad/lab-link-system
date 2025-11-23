# Auto-Assign Orders Marketplace - QA Checklist

## Critical Fixes Implemented

### 1. ✅ Notification Navigation Fixed
**File**: `src/pages/NotificationHistory.tsx` (Line 118-133)

**Before**:
```typescript
// ALL notifications went to dashboard
navigate(`/dashboard?orderId=${notification.order_id}`);
```

**After**:
```typescript
if (notification.type === 'new_marketplace_order') {
  navigate('/orders-marketplace');  // ✅ Marketplace
} else if (notification.type === 'lab_request') {
  navigate('/lab-requests');  // ✅ Lab requests
} else {
  navigate(`/dashboard?orderId=${notification.order_id}`);  // ✅ Dashboard
}
```

**Result**: Clicking marketplace notifications now opens marketplace, not dashboard.

---

### 2. ✅ Marketplace Query Fixed
**File**: `src/pages/OrdersMarketplace.tsx` (Line 47-75)

**Before**:
```typescript
enabled: !!labId,  // ❌ Won't load if labId is null
```

**After**:
```typescript
enabled: !!user?.id,  // ✅ Loads for all authenticated users

// If no labId (new lab staff), show all marketplace orders
if (!labId) return ordersData;
```

**Result**: Marketplace now shows orders even for lab staff without lab_id assignment.

---

### 3. ✅ Lab Staff Without lab_id Warning
**File**: `src/pages/OrdersMarketplace.tsx` (Line 207-214)

**Added**:
```typescript
{!labId && (
  <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
    <p className="text-sm">
      <strong>Note:</strong> You are not currently assigned to a lab. 
      You can browse orders but applications will require lab assignment.
    </p>
  </div>
)}
```

**Result**: Clear messaging for lab staff without lab assignment.

---

### 4. ✅ Dashboard Filtering
**File**: `src/components/OrderDashboard.tsx` (Line 135-168)

**Before**:
```typescript
// All orders fetched, marketplace orders visible in dashboard
.from("orders").select("*")
```

**After**:
```typescript
if (userRole === 'lab_staff') {
  query = query.not('assigned_lab_id', 'is', null');  // ✅ Only assigned orders
}
```

**Result**: Lab dashboards only show assigned orders, not marketplace orders.

---

## Manual Testing Checklist

### Test 1: Doctor Submits Auto-Assign Order
- [ ] Doctor creates order without selecting lab
- [ ] Order has `auto_assign_pending = true` in database
- [ ] Order has `assigned_lab_id = null` in database
- [ ] Lab staff receives notification "New Order in Marketplace"
- [ ] Order appears in `/orders-marketplace`
- [ ] Order does NOT appear in lab dashboard

**SQL Verification**:
```sql
SELECT order_number, auto_assign_pending, assigned_lab_id, status
FROM orders
WHERE auto_assign_pending = true
ORDER BY created_at DESC
LIMIT 5;
```

Expected: `auto_assign_pending: true`, `assigned_lab_id: null`

---

### Test 2: Notification Click Navigation
- [ ] Lab staff clicks "New Order in Marketplace" notification
- [ ] Browser navigates to `/orders-marketplace`
- [ ] Order is visible in marketplace list
- [ ] "Apply to this Order" button is shown

**Expected Route**: `/orders-marketplace`
**NOT**: `/dashboard?orderId=...`

---

### Test 3: Marketplace Visibility
- [ ] Navigate to `/orders-marketplace` as lab staff
- [ ] Marketplace shows orders with `auto_assign_pending = true`
- [ ] Each order card shows:
  - Patient initials (not full name)
  - Order number
  - Restoration type
  - Doctor name
  - Urgency badge
  - Notes preview
  - "Apply to this Order" button

**SQL Verification**:
```sql
SELECT COUNT(*) as marketplace_orders
FROM orders
WHERE auto_assign_pending = true
AND assigned_lab_id IS NULL;
```

Expected: Count matches orders shown in UI

---

### Test 4: Lab Application Flow
- [ ] Lab clicks "Apply to this Order"
- [ ] Request created in `lab_work_requests` table
- [ ] Doctor receives notification "New Lab Application"
- [ ] Order still in marketplace for this lab (shows "Request Sent")
- [ ] Order still does NOT appear in lab dashboard

**SQL Verification**:
```sql
SELECT lwr.status, o.order_number, l.name as lab_name
FROM lab_work_requests lwr
JOIN orders o ON o.id = lwr.order_id
JOIN labs l ON l.id = lwr.lab_id
WHERE lwr.status = 'pending'
ORDER BY lwr.created_at DESC;
```

Expected: Status = 'pending'

---

### Test 5: Doctor Accepts Application
- [ ] Doctor navigates to `/lab-requests`
- [ ] Sees pending application with lab details
- [ ] Clicks "Accept"
- [ ] Order appears in accepted lab's dashboard
- [ ] Order removed from marketplace for all labs
- [ ] Other pending requests changed to 'refused'
- [ ] Accepted lab receives "Order Unlocked" notification
- [ ] Rejected labs receive "Order No Longer Available" notification

**SQL Verification**:
```sql
-- Check order assignment
SELECT order_number, assigned_lab_id, auto_assign_pending
FROM orders
WHERE order_number = 'LAB-XXXX';

-- Check requests status
SELECT lab_id, status
FROM lab_work_requests
WHERE order_id = (SELECT id FROM orders WHERE order_number = 'LAB-XXXX');

-- Check assignments created
SELECT user_id
FROM order_assignments
WHERE order_id = (SELECT id FROM orders WHERE order_number = 'LAB-XXXX');
```

Expected:
- `assigned_lab_id`: Not null
- `auto_assign_pending`: false
- All other requests: 'refused'
- Order assignments created

---

### Test 6: Doctor Rejects Application
- [ ] Doctor navigates to `/lab-requests`
- [ ] Sees pending application
- [ ] Clicks "Reject"
- [ ] Rejected lab receives "Application Not Approved" notification
- [ ] Order removed from rejected lab's marketplace
- [ ] Order still visible to other labs
- [ ] Rejected lab cannot see order anymore
- [ ] Rejected lab cannot reapply (error if attempted)

**SQL Verification**:
```sql
SELECT status
FROM lab_work_requests
WHERE order_id = 'xxx' AND lab_id = 'rejected_lab_id';
```

Expected: Status = 'refused'

**Reapplication Test**:
```sql
-- This should fail with error
INSERT INTO lab_work_requests (order_id, lab_id, requested_by_user_id, status)
VALUES ('xxx', 'rejected_lab_id', 'user_id', 'pending');
```

Expected: Error "cannot reapply"

---

### Test 7: Multiple Labs Apply
- [ ] Lab A applies to order
- [ ] Lab B applies to same order
- [ ] Lab C applies to same order
- [ ] All three requests show 'pending'
- [ ] Doctor accepts Lab B
- [ ] Lab B: Order in dashboard, status 'accepted'
- [ ] Lab A: Request status 'refused', order removed from marketplace
- [ ] Lab C: Request status 'refused', order removed from marketplace
- [ ] All changes happen atomically (no partial states)

**SQL Verification**:
```sql
SELECT lwr.lab_id, lwr.status, l.name
FROM lab_work_requests lwr
JOIN labs l ON l.id = lwr.lab_id
WHERE lwr.order_id = 'xxx';
```

Expected:
- Lab B: 'accepted'
- Lab A: 'refused'
- Lab C: 'refused'

---

### Test 8: Lab Staff Without lab_id
- [ ] Create lab staff user with `user_roles.lab_id = null`
- [ ] Navigate to `/orders-marketplace`
- [ ] Warning message displayed: "You are not currently assigned to a lab"
- [ ] Orders still visible in marketplace
- [ ] Clicking "Apply" shows error or disabled (requires lab assignment)

**SQL Setup**:
```sql
-- Create test user
INSERT INTO user_roles (user_id, role, lab_id)
VALUES ('test_user_id', 'lab_staff', null);
```

---

### Test 9: Notification Icon Display
- [ ] Marketplace notification shows 🏪 icon
- [ ] Lab request notification shows 📋 icon
- [ ] Accepted request shows ✅ icon
- [ ] Refused request shows ❌ icon
- [ ] Status change shows 📊 icon
- [ ] New note shows 📝 icon

---

### Test 10: Audit Trail
- [ ] Lab applies → Record in `lab_application_audit` with action 'applied'
- [ ] Doctor accepts → Record with action 'accepted'
- [ ] Doctor rejects → Record with action 'rejected'

**SQL Verification**:
```sql
SELECT action, order_id, lab_id, created_at
FROM lab_application_audit
ORDER BY created_at DESC
LIMIT 10;
```

---

## Database State Verification Queries

### Check Current Marketplace Orders
```sql
SELECT 
  o.order_number,
  o.patient_name,
  o.doctor_name,
  o.auto_assign_pending,
  o.assigned_lab_id,
  o.status,
  COUNT(lwr.id) as application_count
FROM orders o
LEFT JOIN lab_work_requests lwr ON lwr.order_id = o.id
WHERE o.auto_assign_pending = true
GROUP BY o.id;
```

### Check Lab Applications
```sql
SELECT 
  o.order_number,
  l.name as lab_name,
  lwr.status,
  lwr.created_at
FROM lab_work_requests lwr
JOIN orders o ON o.id = lwr.order_id
JOIN labs l ON l.id = lwr.lab_id
ORDER BY lwr.created_at DESC;
```

### Check Lab Staff Assignments
```sql
SELECT 
  ur.user_id,
  p.email,
  ur.lab_id,
  l.name as lab_name
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
LEFT JOIN labs l ON l.id = ur.lab_id
WHERE ur.role = 'lab_staff';
```

### Check Refused Labs
```sql
SELECT 
  o.order_number,
  l.name as refused_lab,
  lwr.created_at as refused_at
FROM lab_work_requests lwr
JOIN orders o ON o.id = lwr.order_id
JOIN labs l ON l.id = lwr.lab_id
WHERE lwr.status = 'refused';
```

---

## Known Issues & Workarounds

### Issue: Lab Staff Has No lab_id
**Symptom**: Lab staff can view marketplace but cannot apply

**Root Cause**: `user_roles.lab_id` is `null`

**Fix**: Admin must assign lab to user:
```sql
UPDATE user_roles
SET lab_id = 'actual_lab_id'
WHERE user_id = 'lab_staff_user_id';
```

---

## Success Criteria

✅ **All tests pass**
✅ **No orders appear in lab dashboard before acceptance**
✅ **Notifications navigate to correct pages**
✅ **Marketplace shows available orders**
✅ **Rejected labs cannot reapply**
✅ **Only one lab can be assigned per order**
✅ **All actions are audited**

---

## Rollback Plan

If critical issues occur:

1. **Disable auto-assign temporarily**:
```sql
UPDATE orders
SET auto_assign_pending = false
WHERE auto_assign_pending = true;
```

2. **Revert notification routing**:
```typescript
// In NotificationHistory.tsx
navigate(`/dashboard?orderId=${notification.order_id}`);
```

3. **Monitor logs**:
```sql
SELECT * FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## Post-Deployment Monitoring

Monitor these metrics:

- [ ] Number of marketplace orders
- [ ] Lab application rate
- [ ] Doctor acceptance rate
- [ ] Average time to acceptance
- [ ] Number of refused applications
- [ ] Notification delivery success rate

**SQL Monitoring Query**:
```sql
SELECT 
  COUNT(DISTINCT o.id) as total_marketplace_orders,
  COUNT(lwr.id) as total_applications,
  COUNT(CASE WHEN lwr.status = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN lwr.status = 'refused' THEN 1 END) as refused,
  COUNT(CASE WHEN lwr.status = 'pending' THEN 1 END) as pending
FROM orders o
LEFT JOIN lab_work_requests lwr ON lwr.order_id = o.id
WHERE o.created_at > NOW() - INTERVAL '7 days';
```

---

## Contact & Support

For issues or questions:
- Check `docs/AUTO_ASSIGN_WORKFLOW.md` for detailed workflow
- Review audit logs in `lab_application_audit` table
- Check RLS policies with `SELECT * FROM pg_policies WHERE tablename = 'orders'`
