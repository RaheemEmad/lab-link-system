-- Create achievements table to track user milestones
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB,
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

-- Users can earn achievements (system inserts)
CREATE POLICY "Users can earn achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON public.user_achievements(earned_at DESC);

-- Create a function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievement(
  achievement_id_param TEXT,
  user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert achievement if not already earned
  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (user_id_param, achievement_id_param)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  
  -- Return true if this was a new achievement
  RETURN FOUND;
END;
$$;

-- Create trigger to award "first_order" achievement
CREATE OR REPLACE FUNCTION public.award_first_order_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_count INTEGER;
BEGIN
  -- Count total orders for this user
  SELECT COUNT(*) INTO order_count
  FROM public.orders
  WHERE doctor_id = NEW.doctor_id;
  
  -- Award achievement if this is their first order
  IF order_count = 1 THEN
    PERFORM public.check_and_award_achievement('first_order', NEW.doctor_id);
  END IF;
  
  -- Award milestone achievements
  IF order_count = 5 THEN
    PERFORM public.check_and_award_achievement('five_orders', NEW.doctor_id);
  END IF;
  
  IF order_count = 10 THEN
    PERFORM public.check_and_award_achievement('ten_orders', NEW.doctor_id);
  END IF;
  
  IF order_count = 25 THEN
    PERFORM public.check_and_award_achievement('twenty_five_orders', NEW.doctor_id);
  END IF;
  
  IF order_count = 50 THEN
    PERFORM public.check_and_award_achievement('fifty_orders', NEW.doctor_id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_award_first_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.award_first_order_achievement();

-- Award achievement when order is delivered
CREATE OR REPLACE FUNCTION public.award_delivery_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivered_count INTEGER;
BEGIN
  -- Only process when status changes to Delivered
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') THEN
    -- Count delivered orders for this user
    SELECT COUNT(*) INTO delivered_count
    FROM public.orders
    WHERE doctor_id = NEW.doctor_id AND status = 'Delivered';
    
    -- Award milestone achievements
    IF delivered_count = 1 THEN
      PERFORM public.check_and_award_achievement('first_delivery', NEW.doctor_id);
    END IF;
    
    IF delivered_count = 10 THEN
      PERFORM public.check_and_award_achievement('ten_deliveries', NEW.doctor_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_award_delivery
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.award_delivery_achievement();