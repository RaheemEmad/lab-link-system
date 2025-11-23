-- Drop all dependent policies first
DROP POLICY IF EXISTS "Lab staff can create requests" ON public.lab_work_requests;
DROP POLICY IF EXISTS "Lab staff can view their lab requests" ON public.lab_work_requests;
DROP POLICY IF EXISTS "Lab staff can view marketplace orders only" ON public.orders;

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.lab_was_refused_for_order(uuid, uuid) CASCADE;

-- Create security definer function to check if user has completed onboarding
CREATE OR REPLACE FUNCTION public.user_onboarding_completed(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND onboarding_completed = true
  )
$$;

-- Create security definer function to check if lab was refused for order
CREATE OR REPLACE FUNCTION public.lab_was_refused_for_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_work_requests lwr
    JOIN user_roles ur ON ur.lab_id = lwr.lab_id
    WHERE lwr.order_id = _order_id
    AND ur.user_id = _user_id
    AND lwr.status = 'refused'
  )
$$;

-- Recreate orders policy
CREATE POLICY "Lab staff can view marketplace orders only"
ON public.orders
FOR SELECT
USING (
  auto_assign_pending = true 
  AND assigned_lab_id IS NULL 
  AND has_role(auth.uid(), 'lab_staff'::app_role)
  AND public.user_onboarding_completed(auth.uid())
  AND NOT public.lab_was_refused_for_order(id, auth.uid())
);

-- Recreate lab_work_requests policies
CREATE POLICY "Lab staff can create requests"
ON public.lab_work_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by_user_id
  AND EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'lab_staff'::app_role 
      AND lab_id = lab_work_requests.lab_id
  )
  AND public.user_onboarding_completed(auth.uid())
  AND NOT public.lab_was_refused_for_order(lab_work_requests.order_id, auth.uid())
);

CREATE POLICY "Lab staff can view their lab requests"
ON public.lab_work_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'lab_staff'::app_role
      AND lab_id = lab_work_requests.lab_id
  )
);