-- Update RLS policy to exclude orders that lab has been rejected for
DROP POLICY IF EXISTS "Lab staff can view unassigned orders in marketplace" ON public.orders;

CREATE POLICY "Lab staff can view unassigned orders in marketplace"
ON public.orders
FOR SELECT
TO authenticated
USING (
  assigned_lab_id IS NULL 
  AND has_role(auth.uid(), 'lab_staff'::app_role)
  AND NOT EXISTS (
    -- Exclude orders where this lab's request was refused
    SELECT 1 FROM lab_work_requests lwr
    JOIN user_roles ur ON ur.lab_id = lwr.lab_id
    WHERE lwr.order_id = orders.id
    AND ur.user_id = auth.uid()
    AND lwr.status = 'refused'
  )
);