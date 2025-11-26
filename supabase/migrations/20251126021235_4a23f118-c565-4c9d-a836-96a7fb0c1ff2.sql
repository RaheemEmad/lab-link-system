-- Step 1: Update the trigger to create order_assignments when lab request is accepted
CREATE OR REPLACE FUNCTION public.handle_lab_request_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    
    -- Update the order: assign lab and remove from marketplace
    UPDATE public.orders
    SET 
      assigned_lab_id = NEW.lab_id,
      auto_assign_pending = false,
      updated_at = now()
    WHERE id = NEW.order_id
    AND assigned_lab_id IS NULL;
    
    -- Create order_assignment for the requesting user
    INSERT INTO public.order_assignments (order_id, user_id, assigned_by)
    VALUES (NEW.order_id, NEW.requested_by_user_id, NEW.requested_by_user_id)
    ON CONFLICT DO NOTHING;
    
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

-- Step 2: Backfill order_assignments for existing accepted orders
INSERT INTO public.order_assignments (order_id, user_id, assigned_by)
SELECT 
  lwr.order_id,
  lwr.requested_by_user_id,
  lwr.requested_by_user_id
FROM lab_work_requests lwr
INNER JOIN orders o ON o.id = lwr.order_id
WHERE lwr.status = 'accepted'
AND o.assigned_lab_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM order_assignments oa 
  WHERE oa.order_id = lwr.order_id 
  AND oa.user_id = lwr.requested_by_user_id
);