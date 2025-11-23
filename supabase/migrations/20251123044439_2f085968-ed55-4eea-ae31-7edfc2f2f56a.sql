-- Fix lab application RLS policy to allow any onboarding-completed lab to apply

-- Drop and recreate the INSERT policy with clearer logic
DROP POLICY IF EXISTS "Lab staff can create requests" ON public.lab_work_requests;

CREATE POLICY "Lab staff can create requests"
ON public.lab_work_requests
FOR INSERT
WITH CHECK (
  -- Must be the authenticated user
  auth.uid() = requested_by_user_id
  -- Must be lab staff for the lab they're applying from
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'lab_staff'::app_role
    AND user_roles.lab_id = lab_work_requests.lab_id
  )
  -- Must have completed onboarding
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.onboarding_completed = true
  )
  -- Cannot reapply if previously refused for this specific order
  AND NOT EXISTS (
    SELECT 1 FROM public.lab_work_requests lwr
    WHERE lwr.order_id = lab_work_requests.order_id
    AND lwr.lab_id = lab_work_requests.lab_id
    AND lwr.status = 'refused'
  )
);