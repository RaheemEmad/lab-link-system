-- Create table for lab work requests
CREATE TABLE public.lab_work_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, lab_id)
);

-- Enable RLS
ALTER TABLE public.lab_work_requests ENABLE ROW LEVEL SECURITY;

-- Lab staff can view requests for their lab
CREATE POLICY "Lab staff can view their lab requests"
ON public.lab_work_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'
    AND lab_id = lab_work_requests.lab_id
  )
);

-- Lab staff can create requests for their lab
CREATE POLICY "Lab staff can create requests"
ON public.lab_work_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by_user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'
    AND lab_id = lab_work_requests.lab_id
  )
);

-- Doctors can view requests for their orders
CREATE POLICY "Doctors can view requests for their orders"
ON public.lab_work_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = lab_work_requests.order_id
    AND orders.doctor_id = auth.uid()
  )
);

-- Doctors can update status of requests for their orders
CREATE POLICY "Doctors can update request status"
ON public.lab_work_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = lab_work_requests.order_id
    AND orders.doctor_id = auth.uid()
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_lab_work_requests_updated_at
BEFORE UPDATE ON public.lab_work_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create function to notify doctor when lab sends request
CREATE OR REPLACE FUNCTION public.notify_doctor_on_lab_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  doctor_id UUID;
  order_number TEXT;
  lab_name TEXT;
BEGIN
  -- Get doctor_id and order_number
  SELECT o.doctor_id, o.order_number INTO doctor_id, order_number
  FROM public.orders o
  WHERE o.id = NEW.order_id;
  
  -- Get lab name
  SELECT l.name INTO lab_name
  FROM public.labs l
  WHERE l.id = NEW.lab_id;
  
  -- Notify doctor
  IF doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      doctor_id,
      NEW.order_id,
      'lab_request',
      'New Lab Request: ' || order_number,
      lab_name || ' has requested to work on your order.'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new lab requests
CREATE TRIGGER notify_doctor_on_lab_request
AFTER INSERT ON public.lab_work_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_doctor_on_lab_request();

-- Create function to notify lab when request is accepted/refused
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
    
    -- If accepted, assign the lab to the order
    IF NEW.status = 'accepted' THEN
      UPDATE public.orders
      SET assigned_lab_id = NEW.lab_id
      WHERE id = NEW.order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for request status changes
CREATE TRIGGER notify_lab_on_request_status
AFTER UPDATE ON public.lab_work_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_lab_on_request_status();