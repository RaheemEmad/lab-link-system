-- Enable realtime for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Create function to notify lab staff when order is assigned to their lab
CREATE OR REPLACE FUNCTION public.notify_lab_staff_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  lab_staff_record RECORD;
  lab_name TEXT;
  expected_delivery TEXT;
BEGIN
  -- Only notify when a lab is assigned (or changed)
  IF NEW.assigned_lab_id IS NOT NULL AND (OLD.assigned_lab_id IS NULL OR OLD.assigned_lab_id != NEW.assigned_lab_id) THEN
    
    -- Get lab name
    SELECT name INTO lab_name FROM public.labs WHERE id = NEW.assigned_lab_id;
    
    -- Format expected delivery date
    expected_delivery := COALESCE(TO_CHAR(NEW.expected_delivery_date, 'Mon DD, YYYY'), 'TBD');
    
    -- Notify all lab staff assigned to this lab
    FOR lab_staff_record IN 
      SELECT user_id 
      FROM public.user_roles 
      WHERE lab_id = NEW.assigned_lab_id 
      AND role = 'lab_staff'
    LOOP
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      VALUES (
        lab_staff_record.user_id,
        NEW.id,
        'order_assigned',
        'New Order Assigned: ' || NEW.order_number,
        'Order for ' || NEW.patient_name || ' (' || NEW.restoration_type || ') assigned to ' || lab_name || '. Expected delivery: ' || expected_delivery
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for lab assignment notifications
DROP TRIGGER IF EXISTS trigger_notify_lab_staff ON public.orders;
CREATE TRIGGER trigger_notify_lab_staff
  AFTER INSERT OR UPDATE OF assigned_lab_id
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lab_staff_on_assignment();