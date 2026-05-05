ALTER TABLE public.notifications ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'status_change','new_note','note_liked','order_assigned',
    'design_approved','design_rejected','lab_request','lab_request_cancelled',
    'request_accepted','request_refused','new_marketplace_order',
    'payment_approved','payment_rejected'
  ]));