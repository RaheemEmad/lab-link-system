-- Fix the track_order_status_change trigger to properly get the user ID
-- The issue is that auth.uid() returns NULL in SECURITY DEFINER context
-- We need to use current_setting to get the authenticated user

DROP TRIGGER IF EXISTS track_order_status_changes ON orders;
DROP FUNCTION IF EXISTS track_order_status_change();

-- Recreate the function with proper user ID handling
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Only track if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Try to get the user ID from the JWT claim
    BEGIN
      current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      -- If auth.uid() fails, try to get from session
      current_user_id := current_setting('request.jwt.claim.sub', true)::uuid;
    END;
    
    -- If we still don't have a user_id, use the doctor_id or a system user
    IF current_user_id IS NULL THEN
      current_user_id := NEW.doctor_id;
    END IF;
    
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      current_user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER track_order_status_changes
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION track_order_status_change();