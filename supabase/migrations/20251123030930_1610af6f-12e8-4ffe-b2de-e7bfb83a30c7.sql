-- Add audit logging for lab applications
CREATE TABLE IF NOT EXISTS public.lab_application_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('applied', 'accepted', 'rejected', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_application_audit ENABLE ROW LEVEL SECURITY;

-- Doctors and labs can view audit logs for their orders/applications
CREATE POLICY "Users can view relevant audit logs"
ON public.lab_application_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = lab_application_audit.order_id
    AND (o.doctor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.lab_id = lab_application_audit.lab_id
    AND ur.role = 'lab_staff'
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.lab_application_audit
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_lab_application_audit_order ON public.lab_application_audit(order_id);
CREATE INDEX IF NOT EXISTS idx_lab_application_audit_lab ON public.lab_application_audit(lab_id);

-- Function to log lab applications
CREATE OR REPLACE FUNCTION public.log_lab_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the application
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lab_application_audit (order_id, lab_id, user_id, action, metadata)
    VALUES (
      NEW.order_id,
      NEW.lab_id,
      NEW.requested_by_user_id,
      'applied',
      jsonb_build_object('status', NEW.status, 'timestamp', now())
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Log status change (accepted/rejected)
    INSERT INTO public.lab_application_audit (order_id, lab_id, user_id, action, metadata)
    VALUES (
      NEW.order_id,
      NEW.lab_id,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'accepted' THEN 'accepted'
        WHEN NEW.status = 'refused' THEN 'rejected'
        ELSE 'updated'
      END,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'timestamp', now())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for lab application audit
DROP TRIGGER IF EXISTS log_lab_application_trigger ON public.lab_work_requests;
CREATE TRIGGER log_lab_application_trigger
AFTER INSERT OR UPDATE ON public.lab_work_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_lab_application();

-- Update the notify_lab_on_request_status function to handle marketplace workflow
CREATE OR REPLACE FUNCTION public.notify_lab_on_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  lab_staff_record RECORD;
  order_number TEXT;
  order_patient TEXT;
  order_restoration TEXT;
BEGIN
  -- Only notify when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get order details
    SELECT o.order_number, o.patient_name, o.restoration_type 
    INTO order_number, order_patient, order_restoration
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
        CASE 
          WHEN NEW.status = 'accepted' THEN 'Order Unlocked: ' || order_number
          WHEN NEW.status = 'refused' THEN 'Application Not Approved: ' || order_number
          ELSE 'Request Updated: ' || order_number
        END,
        CASE 
          WHEN NEW.status = 'accepted' THEN 'You can now view full details and start working on this ' || order_restoration || ' order for ' || order_patient || '.'
          WHEN NEW.status = 'refused' THEN 'Your application to work on this order was not approved.'
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
        VALUES (NEW.order_id, lab_staff_record.user_id, NEW.order_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
      
      -- Reject all other pending requests for this order
      UPDATE public.lab_work_requests
      SET status = 'refused'
      WHERE order_id = NEW.order_id
      AND id != NEW.id
      AND status = 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_doctor_on_lab_request to include lab profile info in notification
CREATE OR REPLACE FUNCTION public.notify_doctor_on_lab_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doctor_id UUID;
  order_number TEXT;
  order_restoration TEXT;
  lab_name TEXT;
  lab_rating NUMERIC;
BEGIN
  -- Get doctor_id and order details
  SELECT o.doctor_id, o.order_number, o.restoration_type 
  INTO doctor_id, order_number, order_restoration
  FROM public.orders o
  WHERE o.id = NEW.order_id;
  
  -- Get lab details
  SELECT l.name, COALESCE(l.performance_score, 5.0)
  INTO lab_name, lab_rating
  FROM public.labs l
  WHERE l.id = NEW.lab_id;
  
  -- Notify doctor
  IF doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      doctor_id,
      NEW.order_id,
      'lab_request',
      'New Lab Application: ' || order_number,
      lab_name || ' (Rating: ' || lab_rating || '/5) has applied to work on your ' || order_restoration || ' order. Review their profile and accept or decline.'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Prevent labs from reapplying after rejection
CREATE OR REPLACE FUNCTION public.prevent_reapplication()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if this lab was previously refused for this order
  IF EXISTS (
    SELECT 1 FROM public.lab_work_requests
    WHERE order_id = NEW.order_id
    AND lab_id = NEW.lab_id
    AND status = 'refused'
  ) THEN
    RAISE EXCEPTION 'This lab has already been refused for this order and cannot reapply';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent reapplication
DROP TRIGGER IF EXISTS prevent_reapplication_trigger ON public.lab_work_requests;
CREATE TRIGGER prevent_reapplication_trigger
BEFORE INSERT ON public.lab_work_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_reapplication();