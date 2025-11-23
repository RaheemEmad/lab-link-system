-- Add shipment tracking fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS driver_name text,
ADD COLUMN IF NOT EXISTS driver_phone_whatsapp text,
ADD COLUMN IF NOT EXISTS pickup_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS tracking_location text,
ADD COLUMN IF NOT EXISTS shipment_notes text;

-- Add index for tracking location searches
CREATE INDEX IF NOT EXISTS idx_orders_tracking_location ON public.orders(tracking_location);

-- Add index for pickup time
CREATE INDEX IF NOT EXISTS idx_orders_pickup_time ON public.orders(pickup_time);

COMMENT ON COLUMN public.orders.driver_name IS 'Name of the driver handling the shipment';
COMMENT ON COLUMN public.orders.driver_phone_whatsapp IS 'Driver contact number (phone/WhatsApp)';
COMMENT ON COLUMN public.orders.pickup_time IS 'Scheduled pickup time for the shipment';
COMMENT ON COLUMN public.orders.tracking_location IS 'Current tracking location of the shipment';
COMMENT ON COLUMN public.orders.shipment_notes IS 'Additional notes about the shipment';