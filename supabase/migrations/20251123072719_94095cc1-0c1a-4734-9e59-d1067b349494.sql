-- Fix the order_status_history RLS policies to allow lab staff and doctors to insert status changes
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "System can insert status history" ON order_status_history;
DROP POLICY IF EXISTS "Users can view history for orders they can see" ON order_status_history;

-- Create proper policies for status history
-- Lab staff and doctors can insert status history for orders they have access to
CREATE POLICY "Lab staff can insert status history for assigned orders"
ON order_status_history
FOR INSERT
TO public
WITH CHECK (
  (changed_by = auth.uid()) AND
  (
    -- Lab staff can insert for orders they're assigned to
    (
      has_role(auth.uid(), 'lab_staff'::app_role) AND
      EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = order_status_history.order_id
        AND order_assignments.user_id = auth.uid()
      )
    )
    OR
    -- Doctors can insert for their own orders
    (
      has_role(auth.uid(), 'doctor'::app_role) AND
      EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_status_history.order_id
        AND orders.doctor_id = auth.uid()
      )
    )
    OR
    -- Admins can insert for any order
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Users can view status history for orders they can access
CREATE POLICY "Users can view status history for accessible orders"
ON order_status_history
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_status_history.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (
        has_role(auth.uid(), 'lab_staff'::app_role) AND
        EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  )
);