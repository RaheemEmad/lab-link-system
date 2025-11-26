-- Create trigger function to handle lab request acceptance
-- This ensures data consistency even if frontend code fails
CREATE OR REPLACE FUNCTION public.handle_lab_request_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    
    -- Update the order: assign lab and remove from marketplace
    UPDATE public.orders
    SET 
      assigned_lab_id = NEW.lab_id,
      auto_assign_pending = false,
      updated_at = now()
    WHERE id = NEW.order_id
    AND assigned_lab_id IS NULL; -- Safety: only if not already assigned
    
    -- Refuse all other pending requests for this order
    UPDATE public.lab_work_requests
    SET 
      status = 'refused',
      updated_at = now()
    WHERE order_id = NEW.order_id
    AND id != NEW.id
    AND status = 'pending';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on lab_work_requests table
DROP TRIGGER IF EXISTS on_lab_request_accepted ON public.lab_work_requests;

CREATE TRIGGER on_lab_request_accepted
  AFTER UPDATE ON public.lab_work_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION public.handle_lab_request_acceptance();