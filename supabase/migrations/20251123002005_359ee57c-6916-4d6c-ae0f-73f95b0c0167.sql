-- Add indexes for better performance (order_notes already has realtime enabled)
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id_created ON public.order_notes(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_edit_history_order_id ON public.order_edit_history(order_id, changed_at DESC);