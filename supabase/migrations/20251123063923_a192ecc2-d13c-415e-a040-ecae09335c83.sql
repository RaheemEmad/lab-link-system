-- Function to notify doctor when lab cancels/withdraws request
CREATE OR REPLACE FUNCTION public.notify_on_lab_request_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  doctor_id UUID;
  order_number TEXT;
  lab_name TEXT;
BEGIN
  -- Get doctor_id and order number
  SELECT o.doctor_id, o.order_number 
  INTO doctor_id, order_number
  FROM public.orders o
  WHERE o.id = OLD.order_id;
  
  -- Get lab name
  SELECT l.name
  INTO lab_name
  FROM public.labs l
  WHERE l.id = OLD.lab_id;
  
  -- Notify doctor that lab withdrew application
  IF doctor_id IS NOT NULL AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      doctor_id,
      OLD.order_id,
      'lab_request_cancelled',
      'Lab Application Withdrawn',
      lab_name || ' has withdrawn their application for order ' || order_number
    );
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Create trigger for lab request cancellation
DROP TRIGGER IF EXISTS on_lab_request_cancelled ON public.lab_work_requests;
CREATE TRIGGER on_lab_request_cancelled
  BEFORE DELETE ON public.lab_work_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_lab_request_cancellation();