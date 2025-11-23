-- Add handling instructions to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS handling_instructions TEXT;

COMMENT ON COLUMN public.orders.handling_instructions IS 'Special handling requirements like fragile, cold storage, etc.';