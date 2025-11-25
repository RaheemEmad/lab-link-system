-- Fix infinite recursion in lab_work_requests INSERT policy
-- The issue is that the policy queries the same table it's protecting

-- Drop the existing policy
DROP POLICY IF EXISTS "Lab staff create requests" ON public.lab_work_requests;

-- Create a new function to check if a lab was refused for a specific order and lab combination
CREATE OR REPLACE FUNCTION public.check_lab_not_refused(_order_id uuid, _lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.lab_work_requests
    WHERE order_id = _order_id
    AND lab_id = _lab_id
    AND status = 'refused'
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Lab staff create requests"
ON public.lab_work_requests
FOR INSERT
WITH CHECK (
  (auth.uid() = requested_by_user_id)
  AND (EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND lab_id = lab_work_requests.lab_id
    AND role = 'lab_staff'::app_role
  ))
  AND (EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND onboarding_completed = true
  ))
  AND public.check_lab_not_refused(lab_work_requests.order_id, lab_work_requests.lab_id)
);

-- Add comment for documentation
COMMENT ON FUNCTION public.check_lab_not_refused IS 'Security definer function to check if a lab has been refused for an order, preventing infinite recursion in RLS policies';