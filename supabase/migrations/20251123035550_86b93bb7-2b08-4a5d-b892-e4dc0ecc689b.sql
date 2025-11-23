-- Update marketplace RLS policy to ensure only onboarded labs can see orders
DROP POLICY IF EXISTS "Lab staff can view marketplace orders only" ON public.orders;

CREATE POLICY "Lab staff can view marketplace orders only"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auto_assign_pending = true 
  AND assigned_lab_id IS NULL 
  AND has_role(auth.uid(), 'lab_staff')
  AND NOT lab_was_refused_for_order(id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND onboarding_completed = true
  )
);

-- Update lab work requests insert policy to check onboarding
DROP POLICY IF EXISTS "Lab staff can create requests" ON public.lab_work_requests;

CREATE POLICY "Lab staff can create requests"
ON public.lab_work_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requested_by_user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'
    AND lab_id = lab_work_requests.lab_id
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND onboarding_completed = true
  )
);

-- Add comment explaining the verification system
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Acts as verification flag - must be true for labs to access marketplace and apply to orders';