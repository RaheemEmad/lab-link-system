-- Fix order number generation to avoid duplicates
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
DROP FUNCTION IF EXISTS public.set_order_number();
DROP FUNCTION IF EXISTS public.generate_order_number();

-- Create improved order number generation function with retry logic
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  order_num TEXT;
  max_retries INTEGER := 5;
  retry_count INTEGER := 0;
BEGIN
  LOOP
    -- Get the next number based on current max
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.orders
    WHERE order_number LIKE 'LAB-%';
    
    -- Generate the order number
    order_num := 'LAB-' || LPAD(next_number::TEXT, 4, '0');
    
    -- Check if it already exists (race condition check)
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = order_num) THEN
      RETURN order_num;
    END IF;
    
    -- If it exists, increment retry counter
    retry_count := retry_count + 1;
    
    -- If max retries exceeded, use UUID suffix to guarantee uniqueness
    IF retry_count >= max_retries THEN
      order_num := 'LAB-' || LPAD(next_number::TEXT, 4, '0') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
      RETURN order_num;
    END IF;
    
    -- Small delay before retry
    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$function$;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();