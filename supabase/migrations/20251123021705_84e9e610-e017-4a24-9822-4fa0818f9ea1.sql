-- Update the notify_lab_on_request_status function to create order assignments when accepted
CREATE OR REPLACE FUNCTION public.notify_lab_on_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lab_staff_record RECORD;
  order_number TEXT;
BEGIN
  -- Only notify when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get order_number
    SELECT o.order_number INTO order_number
    FROM public.orders o
    WHERE o.id = NEW.order_id;
    
    -- Notify all lab staff of this lab
    FOR lab_staff_record IN 
      SELECT user_id 
      FROM public.user_roles 
      WHERE lab_id = NEW.lab_id 
      AND role = 'lab_staff'
    LOOP
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      VALUES (
        lab_staff_record.user_id,
        NEW.order_id,
        'request_' || NEW.status,
        'Request ' || INITCAP(NEW.status) || ': ' || order_number,
        CASE 
          WHEN NEW.status = 'accepted' THEN 'Your request to work on this order has been accepted!'
          WHEN NEW.status = 'refused' THEN 'Your request to work on this order has been declined.'
          ELSE 'Request status updated'
        END
      );
    END LOOP;
    
    -- If accepted, assign the lab to the order and create order_assignments for all lab staff
    IF NEW.status = 'accepted' THEN
      -- Update the order with assigned lab
      UPDATE public.orders
      SET assigned_lab_id = NEW.lab_id
      WHERE id = NEW.order_id;
      
      -- Create order assignments for all lab staff of this lab to grant them access
      FOR lab_staff_record IN 
        SELECT user_id 
        FROM public.user_roles 
        WHERE lab_id = NEW.lab_id 
        AND role = 'lab_staff'
      LOOP
        INSERT INTO public.order_assignments (order_id, user_id, assigned_by)
        VALUES (NEW.order_id, lab_staff_record.user_id, NEW.order_id) -- Using order_id as placeholder for assigned_by
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;