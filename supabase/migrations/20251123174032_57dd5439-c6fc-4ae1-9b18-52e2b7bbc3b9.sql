-- Simplify and fix RLS policies for lab_work_requests to eliminate fuzzy logic
-- Remove complex nested queries and make policies crystal clear

-- Drop existing policies
DROP POLICY IF EXISTS "Doctors can update request status" ON lab_work_requests;
DROP POLICY IF EXISTS "Doctors can view requests for their orders" ON lab_work_requests;
DROP POLICY IF EXISTS "Lab staff can create requests" ON lab_work_requests;
DROP POLICY IF EXISTS "Lab staff can delete their own pending requests" ON lab_work_requests;
DROP POLICY IF EXISTS "Lab staff can view their lab requests" ON lab_work_requests;

-- Create simplified, clearer policies

-- Policy 1: Doctors can view requests for THEIR orders (simplified join)
CREATE POLICY "Doctors view their order requests"
ON lab_work_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = lab_work_requests.order_id 
    AND orders.doctor_id = auth.uid()
  )
);

-- Policy 2: Doctors can update request status for THEIR orders
CREATE POLICY "Doctors update request status"
ON lab_work_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = lab_work_requests.order_id 
    AND orders.doctor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = lab_work_requests.order_id 
    AND orders.doctor_id = auth.uid()
  )
);

-- Policy 3: Lab staff can view their lab's requests (simplified)
CREATE POLICY "Lab staff view lab requests"
ON lab_work_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_work_requests.lab_id
    AND user_roles.role = 'lab_staff'
  )
);

-- Policy 4: Lab staff can create requests for their lab (simplified validation)
CREATE POLICY "Lab staff create requests"
ON lab_work_requests
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the one creating the request
  auth.uid() = requested_by_user_id
  AND
  -- User must be lab staff for this lab
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_work_requests.lab_id
    AND user_roles.role = 'lab_staff'
  )
  AND
  -- User must have completed onboarding
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.onboarding_completed = true
  )
  AND
  -- Lab must not have been refused for this order before
  NOT EXISTS (
    SELECT 1 FROM lab_work_requests lwr2
    WHERE lwr2.order_id = lab_work_requests.order_id
    AND lwr2.lab_id = lab_work_requests.lab_id
    AND lwr2.status = 'refused'
  )
);

-- Policy 5: Lab staff can delete their own pending requests
CREATE POLICY "Lab staff delete pending requests"
ON lab_work_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = requested_by_user_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_work_requests.lab_id
    AND user_roles.role = 'lab_staff'
  )
);

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_lab_work_requests_order_doctor 
ON lab_work_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_requests_lab 
ON lab_work_requests(lab_id);

CREATE INDEX IF NOT EXISTS idx_lab_work_requests_status 
ON lab_work_requests(status);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_lab_work_requests_composite 
ON lab_work_requests(order_id, lab_id, status);