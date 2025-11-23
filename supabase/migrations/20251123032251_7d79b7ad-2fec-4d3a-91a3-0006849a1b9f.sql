-- Add new notification type to check constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'status_change'::text,
  'new_note'::text, 
  'assignment'::text,
  'new_order'::text,
  'order_assigned'::text,
  'lab_request'::text,
  'request_accepted'::text,
  'request_refused'::text,
  'request_pending'::text,
  'design_approved'::text,
  'design_rejected'::text,
  'new_marketplace_order'::text
]));