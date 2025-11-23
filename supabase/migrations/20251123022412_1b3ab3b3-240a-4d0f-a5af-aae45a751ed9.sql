-- Drop the problematic policy
DROP POLICY IF EXISTS "Lab staff can view unassigned orders in marketplace" ON public.orders;

-- Create function to check if lab was refused for an order
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

-- Recreate the policy using the security definer function
CREATE POLICY "Lab staff can view unassigned orders in marketplace"
ON public.orders
FOR SELECT
TO authenticated
USING (
  assigned_lab_id IS NULL 
  AND has_role(auth.uid(), 'lab_staff'::app_role)
  AND NOT lab_was_refused_for_order(id, auth.uid())
);