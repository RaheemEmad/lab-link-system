
-- Fix infinite recursion between orders and order_assignments RLS.
-- The order_assignments SELECT policy referenced orders (which itself references order_assignments).
-- Replace the cross-table subquery with a SECURITY DEFINER helper that bypasses RLS.

CREATE OR REPLACE FUNCTION public.lab_staff_can_view_assignment(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.user_roles ur ON ur.user_id = _user_id
    WHERE o.id = _order_id
      AND ur.role = 'lab_staff'::app_role
      AND ur.lab_id = o.assigned_lab_id
  )
$$;

DROP POLICY IF EXISTS "View assignments" ON public.order_assignments;

CREATE POLICY "View assignments"
ON public.order_assignments
FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR public.lab_staff_can_view_assignment(order_id, auth.uid())
);
