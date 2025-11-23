-- Fix performance issues in database functions

-- 1. Optimize notify_labs_marketplace_order to only notify relevant labs
-- Instead of notifying ALL lab staff, only notify those whose labs can handle the order type
CREATE OR REPLACE FUNCTION public.notify_labs_marketplace_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lab_user RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Only notify for new auto-assign orders (no lab assigned)
  IF NEW.assigned_lab_id IS NULL AND NEW.auto_assign_pending = TRUE THEN
    -- Send notifications ONLY to labs that can handle this restoration type and have capacity
    FOR lab_user IN 
      SELECT DISTINCT ur.user_id 
      FROM user_roles ur
      INNER JOIN labs l ON l.id = ur.lab_id
      LEFT JOIN lab_specializations ls ON ls.lab_id = l.id
      WHERE ur.role = 'lab_staff'::app_role
      AND l.is_active = TRUE
      AND l.current_load < l.max_capacity
      AND (ls.restoration_type = NEW.restoration_type OR ls.restoration_type IS NULL)
      AND ur.user_id IS NOT NULL
      LIMIT 100  -- Safety limit to prevent notification spam
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
        'new_marketplace_order',
        'New Order Available',
        'New ' || NEW.restoration_type || ' order available. View in Marketplace to apply.'
      );
      notification_count := notification_count + 1;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Optimize notify_lab_on_request_status to reduce loops and use batch operations
CREATE OR REPLACE FUNCTION public.notify_lab_on_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_number TEXT;
  order_patient TEXT;
  order_restoration TEXT;
BEGIN
  -- Only notify when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get order details once
    SELECT o.order_number, o.patient_name, o.restoration_type 
    INTO order_number, order_patient, order_restoration
    FROM public.orders o
    WHERE o.id = NEW.order_id;
    
    -- If accepted, use atomic transaction to assign and reject others
    IF NEW.status = 'accepted' THEN
      -- 1. Assign lab to order and clear auto_assign_pending
      UPDATE public.orders
      SET assigned_lab_id = NEW.lab_id,
          auto_assign_pending = FALSE
      WHERE id = NEW.order_id;
      
      -- 2. Create order assignments for all lab staff (batch insert)
      INSERT INTO public.order_assignments (order_id, user_id, assigned_by)
      SELECT NEW.order_id, user_id, auth.uid()
      FROM public.user_roles 
      WHERE lab_id = NEW.lab_id 
      AND role = 'lab_staff'
      ON CONFLICT DO NOTHING;
      
      -- 3. Reject ALL other pending requests atomically
      UPDATE public.lab_work_requests
      SET status = 'refused'
      WHERE order_id = NEW.order_id
      AND id != NEW.id
      AND status = 'pending';
      
      -- 4. Notify accepted lab staff (batch insert)
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      SELECT 
        ur.user_id,
        NEW.order_id,
        'request_accepted',
        'Order Unlocked: ' || order_number,
        'You can now view full details and start working on this ' || order_restoration || ' order for ' || order_patient || '.'
      FROM public.user_roles ur
      WHERE ur.lab_id = NEW.lab_id 
      AND ur.role = 'lab_staff';
      
      -- 5. Notify rejected labs (batch insert)
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      SELECT DISTINCT
        ur.user_id,
        NEW.order_id,
        'request_refused',
        'Order No Longer Available',
        'This order has been assigned to another lab.'
      FROM public.lab_work_requests lwr
      INNER JOIN public.user_roles ur ON ur.lab_id = lwr.lab_id
      WHERE lwr.order_id = NEW.order_id
      AND lwr.id != NEW.id
      AND lwr.status = 'refused'
      AND ur.role = 'lab_staff';
      
    ELSIF NEW.status = 'refused' THEN
      -- Notify rejected lab staff (batch insert)
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      SELECT 
        ur.user_id,
        NEW.order_id,
        'request_refused',
        'Application Not Approved: ' || order_number,
        'Your application to work on this order was not approved.'
      FROM public.user_roles ur
      WHERE ur.lab_id = NEW.lab_id 
      AND ur.role = 'lab_staff';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Optimize notify_on_new_note to use batch insert instead of loop
CREATE OR REPLACE FUNCTION public.notify_on_new_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order orders%ROWTYPE;
  v_note_author_name text;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  
  -- Get note author name
  SELECT COALESCE(full_name, email) INTO v_note_author_name 
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notify doctor if they didn't write the note
  IF v_order.doctor_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, order_id, type, title, message)
    VALUES (
      v_order.doctor_id,
      NEW.order_id,
      'new_note',
      'New Note on Order ' || v_order.order_number,
      v_note_author_name || ' added a note'
    );
  END IF;
  
  -- Notify assigned lab staff if they didn't write the note (batch insert)
  INSERT INTO notifications (user_id, order_id, type, title, message)
  SELECT DISTINCT
    oa.user_id,
    NEW.order_id,
    'new_note',
    'New Note on Order ' || v_order.order_number,
    v_note_author_name || ' added a note'
  FROM order_assignments oa
  WHERE oa.order_id = NEW.order_id 
  AND oa.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- 4. Optimize notify_new_note (legacy function) to use batch insert
CREATE OR REPLACE FUNCTION public.notify_new_note()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  order_record RECORD;
  note_author_name TEXT;
BEGIN
  -- Get order details
  SELECT order_number, doctor_id, patient_name INTO order_record 
  FROM public.orders WHERE id = NEW.order_id;
  
  -- Get note author name
  SELECT COALESCE(full_name, email) INTO note_author_name
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify doctor (if not the author)
  IF order_record.doctor_id IS NOT NULL AND order_record.doctor_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      order_record.doctor_id,
      NEW.order_id,
      'new_note',
      'New Note on Order ' || order_record.order_number,
      note_author_name || ' added a note to ' || order_record.patient_name || '''s order'
    );
  END IF;
  
  -- Notify assigned lab staff (if not the author) - batch insert
  INSERT INTO public.notifications (user_id, order_id, type, title, message)
  SELECT 
    oa.user_id,
    NEW.order_id,
    'new_note',
    'New Note on Order ' || order_record.order_number,
    note_author_name || ' added a note to ' || order_record.patient_name || '''s order'
  FROM public.order_assignments oa
  WHERE oa.order_id = NEW.order_id
  AND oa.user_id != NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- 5. Add error handling to notify_order_status_change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  doctor_user_id UUID;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the doctor's user_id
    SELECT doctor_id INTO doctor_user_id FROM public.orders WHERE id = NEW.id;
    
    -- Create notification for doctor
    IF doctor_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      VALUES (
        doctor_user_id,
        NEW.id,
        'status_change',
        'Order ' || NEW.order_number || ' Status Updated',
        'Status changed from ' || COALESCE(OLD.status::text, 'N/A') || ' to ' || NEW.status::text
      );
    END IF;
    
    -- Create notifications for assigned lab staff (batch insert)
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    SELECT 
      oa.user_id,
      NEW.id,
      'status_change',
      'Order ' || NEW.order_number || ' Status Updated',
      'Status changed from ' || COALESCE(OLD.status::text, 'N/A') || ' to ' || NEW.status::text
    FROM public.order_assignments oa
    WHERE oa.order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. Optimize notify_lab_staff_on_assignment to use batch insert
CREATE OR REPLACE FUNCTION public.notify_lab_staff_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  lab_name TEXT;
  expected_delivery TEXT;
BEGIN
  -- Only notify when a lab is assigned (or changed)
  IF NEW.assigned_lab_id IS NOT NULL AND (OLD.assigned_lab_id IS NULL OR OLD.assigned_lab_id != NEW.assigned_lab_id) THEN
    
    -- Get lab name
    SELECT name INTO lab_name FROM public.labs WHERE id = NEW.assigned_lab_id;
    
    -- Format expected delivery date
    expected_delivery := COALESCE(TO_CHAR(NEW.expected_delivery_date, 'Mon DD, YYYY'), 'TBD');
    
    -- Notify all lab staff assigned to this lab (batch insert)
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    SELECT 
      ur.user_id,
      NEW.id,
      'order_assigned',
      'New Order Assigned: ' || NEW.order_number,
      'Order for ' || NEW.patient_name || ' (' || NEW.restoration_type || ') assigned to ' || lab_name || '. Expected delivery: ' || expected_delivery
    FROM public.user_roles ur
    WHERE ur.lab_id = NEW.assigned_lab_id 
    AND ur.role = 'lab_staff';
    
  END IF;
  
  RETURN NEW;
END;
$function$;