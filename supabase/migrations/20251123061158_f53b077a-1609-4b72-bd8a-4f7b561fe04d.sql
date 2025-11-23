-- Create trigger for fast design approval achievement
CREATE OR REPLACE FUNCTION public.award_fast_approval_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Award achievement if design was approved within 24 hours of submission
  IF NEW.design_approved = true 
     AND (OLD.design_approved IS NULL OR OLD.design_approved = false)
     AND (NEW.created_at > NOW() - INTERVAL '24 hours') THEN
    PERFORM public.check_and_award_achievement('fast_approver', NEW.doctor_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for fast approval
DROP TRIGGER IF EXISTS trigger_award_fast_approval ON public.orders;
CREATE TRIGGER trigger_award_fast_approval
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_fast_approval_achievement();

-- Create trigger for streak achievements
CREATE OR REPLACE FUNCTION public.award_streak_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  consecutive_weeks INTEGER;
BEGIN
  -- Count consecutive weeks with at least one order
  WITH weekly_orders AS (
    SELECT DISTINCT date_trunc('week', created_at) as week
    FROM public.orders
    WHERE doctor_id = NEW.doctor_id
    AND created_at >= NOW() - INTERVAL '8 weeks'
    ORDER BY week DESC
  ),
  consecutive AS (
    SELECT COUNT(*) as streak
    FROM weekly_orders
  )
  SELECT streak INTO consecutive_weeks FROM consecutive;
  
  -- Award weekly streak achievements
  IF consecutive_weeks >= 4 THEN
    PERFORM public.check_and_award_achievement('four_week_streak', NEW.doctor_id);
  END IF;
  
  IF consecutive_weeks >= 8 THEN
    PERFORM public.check_and_award_achievement('eight_week_streak', NEW.doctor_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for streak
DROP TRIGGER IF EXISTS trigger_award_streak ON public.orders;
CREATE TRIGGER trigger_award_streak
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_streak_achievement();

-- Create trigger for urgent order achievements
CREATE OR REPLACE FUNCTION public.award_urgent_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  urgent_count INTEGER;
BEGIN
  -- Only count when order is delivered
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') AND NEW.urgency = 'Urgent' THEN
    -- Count urgent orders completed
    SELECT COUNT(*) INTO urgent_count
    FROM public.orders
    WHERE doctor_id = NEW.doctor_id 
    AND urgency = 'Urgent'
    AND status = 'Delivered';
    
    IF urgent_count >= 5 THEN
      PERFORM public.check_and_award_achievement('urgent_master', NEW.doctor_id);
    END IF;
    
    IF urgent_count >= 20 THEN
      PERFORM public.check_and_award_achievement('urgent_expert', NEW.doctor_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for urgent achievements
DROP TRIGGER IF EXISTS trigger_award_urgent ON public.orders;
CREATE TRIGGER trigger_award_urgent
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_urgent_achievement();

-- Create trigger for perfect delivery achievements
CREATE OR REPLACE FUNCTION public.award_perfect_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  on_time_count INTEGER;
  total_delivered INTEGER;
BEGIN
  -- Only check when order is delivered
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') THEN
    -- Count on-time deliveries (delivered on or before expected date)
    SELECT COUNT(*) INTO on_time_count
    FROM public.orders
    WHERE doctor_id = NEW.doctor_id 
    AND status = 'Delivered'
    AND actual_delivery_date <= expected_delivery_date;
    
    SELECT COUNT(*) INTO total_delivered
    FROM public.orders
    WHERE doctor_id = NEW.doctor_id 
    AND status = 'Delivered';
    
    -- If 10 consecutive on-time deliveries
    IF on_time_count >= 10 AND on_time_count = total_delivered THEN
      PERFORM public.check_and_award_achievement('perfect_timing', NEW.doctor_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for perfect delivery
DROP TRIGGER IF EXISTS trigger_award_perfect_delivery ON public.orders;
CREATE TRIGGER trigger_award_perfect_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_perfect_delivery();