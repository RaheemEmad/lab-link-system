-- Add auto_assign_pending flag to track marketplace orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS auto_assign_pending BOOLEAN DEFAULT FALSE;

-- Update existing unassigned orders to be marked as pending
UPDATE public.orders 
SET auto_assign_pending = TRUE 
WHERE assigned_lab_id IS NULL;

-- Create index for faster marketplace queries
CREATE INDEX IF NOT EXISTS idx_orders_auto_assign_pending 
ON public.orders(auto_assign_pending) 
WHERE auto_assign_pending = TRUE AND assigned_lab_id IS NULL;

-- Update RLS policy for marketplace visibility
-- Labs can ONLY see orders in marketplace (auto_assign_pending=true, not assigned, not refused)
DROP POLICY IF EXISTS "Lab staff can view unassigned orders in marketplace" ON public.orders;

CREATE POLICY "Lab staff can view marketplace orders only"
ON public.orders
FOR SELECT
USING (
  auto_assign_pending = TRUE
  AND assigned_lab_id IS NULL
  AND has_role(auth.uid(), 'lab_staff'::app_role)
  AND NOT lab_was_refused_for_order(id, auth.uid())
);

-- Ensure labs can ONLY view assigned orders they have access to
DROP POLICY IF EXISTS "Assigned lab staff and admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Doctors and assigned lab staff can view orders" ON public.orders;

CREATE POLICY "Labs can view assigned orders only"
ON public.orders
FOR SELECT
USING (
  (auth.uid() = doctor_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    assigned_lab_id IS NOT NULL
    AND has_role(auth.uid(), 'lab_staff'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.order_assignments
      WHERE order_assignments.order_id = orders.id
      AND order_assignments.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Labs can update assigned orders only"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    assigned_lab_id IS NOT NULL
    AND has_role(auth.uid(), 'lab_staff'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.order_assignments
      WHERE order_assignments.order_id = orders.id
      AND order_assignments.user_id = auth.uid()
    )
  )
);

-- Update notify_lab_on_request_status to use atomic operations
CREATE OR REPLACE FUNCTION public.notify_lab_on_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lab_staff_record RECORD;
  order_number TEXT;
  order_patient TEXT;
  order_restoration TEXT;
  other_lab_record RECORD;
BEGIN
  -- Only notify when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get order details
    SELECT o.order_number, o.patient_name, o.restoration_type 
    INTO order_number, order_patient, order_restoration
    FROM public.orders o
    WHERE o.id = NEW.order_id;
    
    -- If accepted, use atomic transaction to assign and reject others
    IF NEW.status = 'accepted' THEN
      -- ATOMIC: Update order, create assignments, reject other requests, clear auto_assign flag
      -- This all happens in one transaction
      
      -- 1. Assign lab to order and clear auto_assign_pending
      UPDATE public.orders
      SET assigned_lab_id = NEW.lab_id,
          auto_assign_pending = FALSE
      WHERE id = NEW.order_id;
      
      -- 2. Create order assignments for all lab staff
      FOR lab_staff_record IN 
        SELECT user_id 
        FROM public.user_roles 
        WHERE lab_id = NEW.lab_id 
        AND role = 'lab_staff'
      LOOP
        INSERT INTO public.order_assignments (order_id, user_id, assigned_by)
        VALUES (NEW.order_id, lab_staff_record.user_id, auth.uid())
        ON CONFLICT DO NOTHING;
      END LOOP;
      
      -- 3. Reject ALL other pending requests atomically
      UPDATE public.lab_work_requests
      SET status = 'refused'
      WHERE order_id = NEW.order_id
      AND id != NEW.id
      AND status = 'pending';
      
      -- 4. Notify accepted lab staff
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
          'request_accepted',
          'Order Unlocked: ' || order_number,
          'You can now view full details and start working on this ' || order_restoration || ' order for ' || order_patient || '.'
        );
      END LOOP;
      
      -- 5. Notify rejected labs
      FOR other_lab_record IN
        SELECT DISTINCT lwr.lab_id, ur.user_id
        FROM public.lab_work_requests lwr
        JOIN public.user_roles ur ON ur.lab_id = lwr.lab_id
        WHERE lwr.order_id = NEW.order_id
        AND lwr.id != NEW.id
        AND lwr.status = 'refused'
        AND ur.role = 'lab_staff'
      LOOP
        INSERT INTO public.notifications (user_id, order_id, type, title, message)
        VALUES (
          other_lab_record.user_id,
          NEW.order_id,
          'request_refused',
          'Order No Longer Available',
          'This order has been assigned to another lab.'
        );
      END LOOP;
      
    ELSIF NEW.status = 'refused' THEN
      -- Notify rejected lab staff
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
          'request_refused',
          'Application Not Approved: ' || order_number,
          'Your application to work on this order was not approved.'
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_doctor_on_lab_request to send minimal notification
CREATE OR REPLACE FUNCTION public.notify_doctor_on_lab_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doctor_id UUID;
  order_number TEXT;
  lab_name TEXT;
BEGIN
  -- Get doctor_id and order number
  SELECT o.doctor_id, o.order_number 
  INTO doctor_id, order_number
  FROM public.orders o
  WHERE o.id = NEW.order_id;
  
  -- Get lab name
  SELECT l.name
  INTO lab_name
  FROM public.labs l
  WHERE l.id = NEW.lab_id;
  
  -- Send MINIMAL notification (no order details, just text)
  IF doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      doctor_id,
      NEW.order_id,
      'lab_request',
      'New Lab Application',
      lab_name || ' applied to work on order ' || order_number || '. Review application in Lab Applications.'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to send minimal marketplace notification to labs
CREATE OR REPLACE FUNCTION public.notify_labs_marketplace_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lab_user RECORD;
BEGIN
  -- Only notify for new auto-assign orders (no lab assigned)
  IF NEW.assigned_lab_id IS NULL AND NEW.auto_assign_pending = TRUE THEN
    -- Send MINIMAL notification (just text, no details)
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
        'new_marketplace_order',
        'New Order in Marketplace',
        'Dr. ' || NEW.doctor_name || ' submitted a new order. View in Marketplace to apply.'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for minimal marketplace notifications
DROP TRIGGER IF EXISTS notify_labs_marketplace_order_trigger ON public.orders;
CREATE TRIGGER notify_labs_marketplace_order_trigger
AFTER INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.assigned_lab_id IS NULL AND NEW.auto_assign_pending = TRUE)
EXECUTE FUNCTION public.notify_labs_marketplace_order();