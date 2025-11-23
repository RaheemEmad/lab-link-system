-- Allow lab staff to view unassigned orders in marketplace
CREATE POLICY "Lab staff can view unassigned orders in marketplace"
ON public.orders
FOR SELECT
TO authenticated
USING (
  assigned_lab_id IS NULL 
  AND has_role(auth.uid(), 'lab_staff'::app_role)
);

-- Create function to notify all labs when a new order is created
CREATE OR REPLACE FUNCTION notify_labs_new_order()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  lab_user RECORD;
BEGIN
  -- Only notify for new unassigned orders
  IF NEW.assigned_lab_id IS NULL THEN
    -- Create notification for each lab staff user
    FOR lab_user IN 
      SELECT DISTINCT user_id 
      FROM user_roles 
      WHERE role = 'lab_staff'::app_role
    LOOP
      INSERT INTO notifications (
        user_id,
        order_id,
        type,
        title,
        message
      ) VALUES (
        lab_user.user_id,
        NEW.id,
        'new_order',
        'New Order Available',
        'A new ' || NEW.restoration_type || ' order from Dr. ' || NEW.doctor_name || ' is available in the marketplace'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to notify labs on new orders
DROP TRIGGER IF EXISTS trigger_notify_labs_new_order ON public.orders;
CREATE TRIGGER trigger_notify_labs_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION notify_labs_new_order();