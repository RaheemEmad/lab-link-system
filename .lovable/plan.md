
# Comprehensive Fix: Pricing Validation, Lab Verification, and Notification System

## Summary of Issues to Address

### 1. Order Assignment Error - "Cannot assign order to lab without configured pricing"
**Current State**: A database trigger blocks order assignment when `labs.pricing_mode IS NULL`. Currently, only 1 of 16 labs has pricing configured.

**Problems**:
- Error message is unclear and shows as raw database error
- No pre-check before attempting the assignment
- No graceful handling or guidance to fix

### 2. Lab Application Page Missing Pricing Information
**Current State**: When labs apply to orders, the doctor sees rating, turnaround, capacity, and location but NO pricing information.

**Missing**:
- Pricing mode badge (Template vs Custom)
- Starting price range for the restoration type
- Lab's pricing details in the application review

### 3. Verification Badge Logic Not Based on Completed Orders
**Current State**: "Verified" badge is based on `onboarding_completed` flag, NOT on completed orders.

**Requirement**: Labs should earn verification after completing their first 2 orders successfully.

### 4. Risk Matrix & Verification Transparency Missing
**Current State**: No mechanism to track verification criteria or revoke verification.

**Requirement**: 
- Labs should see how verification works
- Verification should be revoked for: dropped ratings, missed deliveries, billing disputes

### 5. Notification System Issues
**Current State**: Real-time notifications work via Supabase Realtime, but may have gaps.

**Issues to verify**:
- Badge count updates may be delayed
- New order/application notifications may not trigger immediately

---

## Implementation Plan

### Part 1: Better Error Handling for Pricing Validation

#### A. Pre-check Before Assignment
Add client-side validation BEFORE attempting the database operation to provide clearer error messages.

**File**: `src/pages/LabRequestsManagement.tsx`

```typescript
// Before line 160-161 (where order assignment happens)
// Add pre-check for lab pricing
const { data: labPricingCheck } = await supabase
  .from('labs')
  .select('pricing_mode, name')
  .eq('id', requestData.lab_id)
  .single();

if (!labPricingCheck?.pricing_mode) {
  throw new Error(
    `Cannot accept this lab's application. ${labPricingCheck?.name || 'The lab'} has not configured their pricing yet. Please decline and choose a lab with pricing configured, or ask the lab to set up their pricing in Lab Admin > Pricing.`
  );
}
```

#### B. Also Update OrdersMarketplace.tsx Admin Override
**File**: `src/pages/OrdersMarketplace.tsx` (lines 256-309)

Add similar pre-check for admin override assignment.

#### C. Show Visual Warning on Unprice Labs
Update UI to show warning badge on labs without pricing configured.

---

### Part 2: Display Lab Pricing on Application Cards

#### A. Update Query to Include pricing_mode
**File**: `src/pages/LabRequestsManagement.tsx` (lines 79-94)

Add `pricing_mode` to the labs select:
```typescript
labs!inner (
  id,
  name,
  description,
  logo_url,
  address,
  contact_email,
  contact_phone,
  website_url,
  pricing_tier,
  performance_score,
  standard_sla_days,
  urgent_sla_days,
  current_load,
  max_capacity,
  pricing_mode  // Add this
)
```

#### B. Add Pricing Section to Application Card
**Location**: After the "Lab Profile Summary" grid (around line 714)

Add a new section:
```tsx
{/* Lab Pricing Information */}
<div className="mt-4 pt-4 border-t">
  <LabPricingDisplay 
    labId={lab.id}
    pricingMode={lab.pricing_mode}
    showCard={false}
    compact
    showLabel
  />
</div>
```

#### C. Add Warning Banner for Labs Without Pricing
```tsx
{!lab.pricing_mode && (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
    <AlertCircle className="h-5 w-5 text-amber-600" />
    <div>
      <p className="font-medium text-amber-800">Pricing Not Configured</p>
      <p className="text-sm text-amber-700">
        This lab cannot be assigned orders until they configure their pricing.
      </p>
    </div>
  </div>
)}
```

---

### Part 3: Verification Badge Based on Completed Orders

#### A. Database Changes - Add Verification Columns
```sql
-- Add verification tracking to labs table
ALTER TABLE labs
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS completed_order_count INTEGER DEFAULT 0;

-- Create trigger to auto-verify after 2 completed orders
CREATE OR REPLACE FUNCTION update_lab_verification()
RETURNS TRIGGER AS $$
DECLARE
  v_completed_count INTEGER;
  v_lab_id UUID;
  v_has_disputes BOOLEAN;
  v_avg_rating NUMERIC;
BEGIN
  -- Get the lab_id from the order
  v_lab_id := NEW.assigned_lab_id;
  
  IF v_lab_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only process when order becomes Delivered
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') THEN
    -- Count completed orders
    SELECT COUNT(*) INTO v_completed_count
    FROM orders
    WHERE assigned_lab_id = v_lab_id
    AND status = 'Delivered';
    
    -- Update completed count
    UPDATE labs SET completed_order_count = v_completed_count WHERE id = v_lab_id;
    
    -- Auto-verify if 2+ completed orders
    IF v_completed_count >= 2 THEN
      UPDATE labs 
      SET is_verified = true, verified_at = COALESCE(verified_at, now())
      WHERE id = v_lab_id AND is_verified = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lab_verification_trigger ON orders;
CREATE TRIGGER lab_verification_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_verification();
```

#### B. Update Labs.tsx to Use is_verified
**File**: `src/pages/Labs.tsx`

Change verification logic from `hasCompletedProfile` to use `is_verified` column:
```typescript
// Update the query to include is_verified
.select(`*, is_verified`)

// Update separation logic (around line 250)
const verified = filtered.filter(lab => lab.is_verified === true);
const unverified = filtered.filter(lab => lab.is_verified !== true);
```

#### C. Update LabCard to Accept is_verified from DB
**File**: `src/components/labs/LabCard.tsx`

Add `is_verified` to Lab interface and use it directly.

---

### Part 4: Risk Matrix & Verification Revocation

#### A. Create Verification Status Types
```sql
-- Add verification risk tracking
ALTER TABLE labs
ADD COLUMN IF NOT EXISTS verification_risk_score NUMERIC DEFAULT 0;

ALTER TABLE labs  
ADD COLUMN IF NOT EXISTS verification_status TEXT 
CHECK (verification_status IN ('pending', 'verified', 'at_risk', 'revoked'))
DEFAULT 'pending';

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS last_risk_check_at TIMESTAMPTZ;
```

#### B. Create Risk Check Function
```sql
CREATE OR REPLACE FUNCTION check_lab_verification_risk()
RETURNS void AS $$
DECLARE
  lab_record RECORD;
  v_dispute_count INTEGER;
  v_missed_deliveries INTEGER;
  v_recent_rating NUMERIC;
  v_risk_score NUMERIC;
BEGIN
  FOR lab_record IN SELECT id, is_verified FROM labs WHERE is_verified = true LOOP
    -- Count recent disputes (last 90 days)
    SELECT COUNT(*) INTO v_dispute_count
    FROM invoices i
    JOIN orders o ON i.order_id = o.id
    WHERE o.assigned_lab_id = lab_record.id
    AND i.status = 'disputed'
    AND i.created_at > now() - interval '90 days';
    
    -- Count missed deliveries (SLA violations in last 90 days)
    SELECT COUNT(*) INTO v_missed_deliveries
    FROM orders o
    LEFT JOIN order_sla_tracking s ON o.id = s.order_id
    WHERE o.assigned_lab_id = lab_record.id
    AND s.sla_violated = true
    AND o.created_at > now() - interval '90 days';
    
    -- Calculate average recent rating from reviews
    SELECT AVG(rating) INTO v_recent_rating
    FROM lab_reviews
    WHERE lab_id = lab_record.id
    AND created_at > now() - interval '90 days';
    
    -- Calculate risk score (0-100, higher = more risk)
    v_risk_score := 0;
    v_risk_score := v_risk_score + (v_dispute_count * 15);  -- Each dispute adds 15
    v_risk_score := v_risk_score + (v_missed_deliveries * 10);  -- Each SLA violation adds 10
    IF v_recent_rating IS NOT NULL AND v_recent_rating < 3.5 THEN
      v_risk_score := v_risk_score + ((3.5 - v_recent_rating) * 20);  -- Low ratings add risk
    END IF;
    
    -- Update lab
    UPDATE labs SET
      verification_risk_score = v_risk_score,
      last_risk_check_at = now(),
      verification_status = CASE
        WHEN v_risk_score >= 50 THEN 'revoked'
        WHEN v_risk_score >= 30 THEN 'at_risk'
        ELSE 'verified'
      END,
      is_verified = (v_risk_score < 50)
    WHERE id = lab_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### C. Create LabVerificationStatus Component
**File**: `src/components/labs/LabVerificationStatus.tsx`

A component that shows labs their verification status and risk factors:
```tsx
interface LabVerificationStatusProps {
  labId: string;
}

export function LabVerificationStatus({ labId }: LabVerificationStatusProps) {
  // Fetch verification data
  // Display:
  // - Current status (Pending/Verified/At Risk/Revoked)
  // - Progress towards verification (if pending)
  // - Risk factors (if at risk)
  // - How to recover (if revoked)
  // - Explanation of criteria
}
```

---

### Part 5: Enhance Notification System

#### A. Add More Notification Types
Update `POPUP_NOTIFICATION_TYPES` in useRealtimeNotifications.tsx:
```typescript
const POPUP_NOTIFICATION_TYPES = [
  'order_accepted',
  'delivery_confirmed',
  'feedback_received',
  'invoice_generated',
  'sla_warning',
  'new_lab_request',
  'status_update',
  'delivery_issue',
  'new_order',           // Add
  'bid_submitted',       // Add
  'bid_accepted',        // Add
  'bid_declined',        // Add
  'order_assigned',      // Add
  'invoice_disputed',    // Add
  'dispute_resolved',    // Add
];
```

#### B. Ensure Notifications Are Created for All Key Events
Audit all mutation functions to ensure notifications are inserted.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/labs/LabVerificationStatus.tsx` | Show labs their verification status and criteria |
| `src/components/labs/LabVerificationBadge.tsx` | Unified badge component showing verification + risk status |

## Files to Modify

| File | Changes |
|------|---------|
| Migration SQL | Add is_verified, verification_status, risk columns to labs; add triggers |
| `src/pages/LabRequestsManagement.tsx` | Add pre-check for pricing, show pricing in cards |
| `src/pages/OrdersMarketplace.tsx` | Add pre-check for pricing in admin override |
| `src/pages/Labs.tsx` | Use is_verified from database instead of profile check |
| `src/components/labs/LabCard.tsx` | Update to use is_verified prop from DB |
| `src/components/labs/LabProfilePreview.tsx` | Add verification status display |
| `src/pages/LabAdmin.tsx` | Add verification status section |
| `src/hooks/useRealtimeNotifications.tsx` | Add more notification types |

---

## Error Handling Strategy

### User-Friendly Error Messages

Instead of showing:
> "Cannot assign order to lab without configured pricing"

Show:
> "**Cannot Accept Application**  
> [Lab Name] has not set up their pricing yet. You can:
> 1. Decline this application and choose another lab
> 2. Ask the lab to configure pricing in their Lab Admin dashboard
> 
> Labs must complete pricing setup before they can be assigned orders."

### Disable Accept Button for Unconfigured Labs

```tsx
<Button
  disabled={!lab.pricing_mode || updateRequestStatus.isPending}
  title={!lab.pricing_mode ? "Lab has not configured pricing" : undefined}
>
  Accept Application
</Button>
```

---

## Verification Flow Summary

```text
Lab Created
     |
     v
Status: "Pending Verification"
     |
     v
Lab Completes 2 Orders Successfully
     |
     v
Status: "Verified" ✓ Badge Shown
     |
     v
Monthly Risk Check:
  ├── Risk Score < 30 → Stay Verified
  ├── Risk Score 30-49 → "At Risk" Warning
  └── Risk Score >= 50 → Verification Revoked
```

---

## Expected Outcomes

1. Clear, actionable error when trying to assign labs without pricing
2. Accept buttons disabled for labs without pricing (prevents confusion)
3. Pricing visible on all lab application cards
4. Verification based on actual order completion (2+ delivered orders)
5. Risk matrix tracks disputes, SLA violations, and ratings
6. Labs see transparent verification criteria and progress
7. Notifications trigger in real-time for all key events
