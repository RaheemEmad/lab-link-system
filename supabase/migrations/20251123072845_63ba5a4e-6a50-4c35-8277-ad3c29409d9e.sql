-- Remove duplicate status tracking trigger
DROP TRIGGER IF EXISTS log_order_status_changes ON orders;

-- Fix the award_rush_hour_hero_achievement trigger - it's trying to access fields that don't exist
-- This trigger should be on orders table, not order_status_history
DROP TRIGGER IF EXISTS trigger_rush_hour_hero ON order_status_history;
DROP FUNCTION IF EXISTS award_rush_hour_hero_achievement();

-- Recreate the function to work properly on orders table
CREATE OR REPLACE FUNCTION award_rush_hour_hero_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Award when urgent order moves to "In Progress" within 1 hour of creation
  IF NEW.urgency = 'Urgent' AND 
     NEW.status = 'In Progress' AND
     OLD.status = 'Pending' AND
     (NEW.updated_at - NEW.created_at) <= INTERVAL '1 hour' THEN
    
    -- Find who changed the status (from order_assignments)
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT user_id, 'rush_hour_hero'
    FROM order_assignments
    WHERE order_id = NEW.id
    LIMIT 1
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Add the trigger to the ORDERS table (not order_status_history)
CREATE TRIGGER trigger_rush_hour_hero
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION award_rush_hour_hero_achievement();

-- Also fix award_data_dynamo - it references non-existent changed_by field
DROP TRIGGER IF EXISTS trigger_data_dynamo ON orders;
DROP FUNCTION IF EXISTS award_data_dynamo_achievement();

CREATE OR REPLACE FUNCTION award_data_dynamo_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Count status updates by assigned staff today
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Award to lab staff who processed 10+ orders today
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT oa.user_id, 'data_dynamo'
    FROM order_assignments oa
    WHERE oa.order_id = NEW.id
    AND (
      SELECT COUNT(DISTINCT o.id)
      FROM orders o
      JOIN order_assignments oa2 ON oa2.order_id = o.id
      WHERE oa2.user_id = oa.user_id
      AND o.status_updated_at::date = CURRENT_DATE
    ) >= 10
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_data_dynamo
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION award_data_dynamo_achievement();