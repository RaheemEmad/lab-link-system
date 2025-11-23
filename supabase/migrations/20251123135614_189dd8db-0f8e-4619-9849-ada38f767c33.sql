-- Fix search path warnings by ensuring all functions have explicit search_path set
-- This prevents potential security issues from search path manipulation

-- Update functions that might not have search_path set
CREATE OR REPLACE FUNCTION public.update_chat_message_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.chat_typing_indicators
  WHERE updated_at < NOW() - INTERVAL '30 seconds'
  AND is_typing = false;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_speed_demon_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Award achievement if order completed in under 48 hours
  IF NEW.status = 'Delivered' 
     AND (OLD.status IS NULL OR OLD.status != 'Delivered')
     AND (NEW.actual_delivery_date::timestamp - NEW.created_at) <= INTERVAL '48 hours' THEN
    PERFORM public.check_and_award_achievement('speed_demon', NEW.doctor_id);
  END IF;
  
  RETURN NEW;
END;
$function$;