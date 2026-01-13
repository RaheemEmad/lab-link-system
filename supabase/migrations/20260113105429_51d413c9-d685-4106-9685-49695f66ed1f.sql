-- Fix the trigger function to use correct enum case (PascalCase)
-- The order_status enum uses 'Delivered' not 'delivered'
CREATE OR REPLACE FUNCTION public.trigger_recalc_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Use 'Delivered' (PascalCase) to match the order_status enum
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') THEN
    IF NEW.assigned_lab_id IS NOT NULL THEN
      PERFORM calculate_lab_trust_score(NEW.assigned_lab_id);
      PERFORM update_lab_visibility_tier(NEW.assigned_lab_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;