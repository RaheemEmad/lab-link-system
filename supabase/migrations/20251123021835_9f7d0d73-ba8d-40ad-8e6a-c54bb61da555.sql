-- Update notifications type check constraint to include all notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'status_change', 
  'new_note', 
  'assignment',
  'new_order',           -- Labs get notified of new marketplace orders
  'order_assigned',      -- Lab staff notified when order is assigned to their lab
  'lab_request',         -- Doctor notified when lab requests to work on order
  'request_accepted',    -- Lab notified when their request is accepted
  'request_refused',     -- Lab notified when their request is refused
  'request_pending',     -- Lab notified of pending request status
  'design_approved',     -- Doctor notified when design is approved
  'design_rejected'      -- Doctor notified when design needs revision
));