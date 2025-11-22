-- Create order edit history table to track all changes to orders
CREATE TABLE public.order_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changed_fields JSONB NOT NULL,
  change_summary TEXT,
  CONSTRAINT fk_changed_by FOREIGN KEY (changed_by) REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.order_edit_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view edit history for orders they can access
CREATE POLICY "Users can view edit history for accessible orders"
ON public.order_edit_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_edit_history.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR public.has_role(auth.uid(), 'lab_staff'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Policy: System can insert edit history
CREATE POLICY "System can insert edit history"
ON public.order_edit_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_order_edit_history_order_id ON public.order_edit_history(order_id);
CREATE INDEX idx_order_edit_history_changed_at ON public.order_edit_history(changed_at DESC);