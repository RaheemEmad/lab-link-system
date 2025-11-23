-- First, update any non-standard notification types to standard ones
-- 'new_order' should be 'order_assigned' or 'new_marketplace_order'
UPDATE notifications 
SET type = 'new_marketplace_order' 
WHERE type = 'new_order';

-- Drop the existing check constraint if it exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add comprehensive check constraint with all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'status_change',
  'new_note',
  'note_liked',
  'order_assigned',
  'design_approved',
  'design_rejected',
  'lab_request',
  'lab_request_cancelled',
  'request_accepted',
  'request_refused',
  'new_marketplace_order'
));