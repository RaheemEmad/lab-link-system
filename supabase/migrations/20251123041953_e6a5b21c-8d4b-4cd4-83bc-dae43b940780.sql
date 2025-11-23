-- Remove legacy auto-assignment logic and ensure proper marketplace access control

-- Update the marketplace RLS policy to exclude orders where the lab was refused
DROP POLICY IF EXISTS "Lab staff can view marketplace orders only" ON public.orders;

CREATE POLICY "Lab staff can view marketplace orders only"
ON public.orders
FOR SELECT
USING (
  auto_assign_pending = true 
  AND assigned_lab_id IS NULL 
  AND has_role(auth.uid(), 'lab_staff'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.onboarding_completed = true
  )
  -- Exclude orders where this lab was refused
  AND NOT lab_was_refused_for_order(orders.id, auth.uid())
);

-- Ensure lab_work_requests allows all onboarding-completed labs to apply
DROP POLICY IF EXISTS "Lab staff can create requests" ON public.lab_work_requests;

CREATE POLICY "Lab staff can create requests"
ON public.lab_work_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by_user_id
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'lab_staff'::app_role
    AND user_roles.lab_id = lab_work_requests.lab_id
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.onboarding_completed = true
  )
  -- Allow application only if not previously refused
  AND NOT lab_was_refused_for_order(lab_work_requests.order_id, auth.uid())
);

-- Add comment to document the marketplace logic
COMMENT ON POLICY "Lab staff can view marketplace orders only" ON public.orders IS 
'Labs can view unassigned auto-assign orders in marketplace, excluding orders where they were refused by the doctor';

COMMENT ON POLICY "Lab staff can create requests" ON public.lab_work_requests IS 
'Any onboarding-completed lab staff can apply to marketplace orders, unless previously refused by the doctor';