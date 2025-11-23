-- Update notify_labs_new_order function to NOT notify for auto-assign orders
-- Labs should only see orders in marketplace, not get notifications
DROP FUNCTION IF EXISTS public.notify_labs_new_order() CASCADE;

-- Remove the trigger that notifies labs about new orders
DROP TRIGGER IF EXISTS notify_labs_new_order_trigger ON public.orders;

-- Labs will discover orders by browsing the marketplace, not via notifications
-- This prevents spam and ensures only interested labs apply