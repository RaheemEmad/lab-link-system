-- Check if there's an existing trigger that's causing issues and drop it if it exists
DO $$ 
BEGIN
  -- Drop the trigger if it exists (it may be causing the "Changed By" error)
  DROP TRIGGER IF EXISTS track_order_status_changes ON orders;
  DROP FUNCTION IF EXISTS track_order_status_change();
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore errors if they don't exist
END $$;

-- Create a proper trigger function that handles status changes correctly
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only track if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_status_history (
      order_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid() -- Get the current user's ID from Supabase auth context
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS track_order_status_changes ON orders;
CREATE TRIGGER track_order_status_changes
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_status_change();