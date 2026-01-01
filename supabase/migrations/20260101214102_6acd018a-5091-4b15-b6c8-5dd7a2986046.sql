-- Add delivery confirmation columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_pending_confirmation boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_confirmed_by uuid;