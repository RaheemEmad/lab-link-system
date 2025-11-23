-- Add read receipts and typing indicator support to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_by UUID;

-- Add file attachments to chat messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

-- Create typing indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS public.chat_typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on typing indicators
ALTER TABLE public.chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Allow users to view typing indicators for their orders
CREATE POLICY "Users can view typing indicators for their orders"
ON public.chat_typing_indicators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = chat_typing_indicators.order_id
    AND (
      o.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'lab_staff'
        AND ur.lab_id = o.assigned_lab_id
      )
    )
  )
);

-- Allow users to update their own typing status
CREATE POLICY "Users can update their own typing status"
ON public.chat_typing_indicators
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_chat_typing_order_user ON public.chat_typing_indicators(order_id, user_id);

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing_indicators;

-- Create function to auto-cleanup old typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.chat_typing_indicators
  WHERE updated_at < NOW() - INTERVAL '30 seconds'
  AND is_typing = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to cleanup old typing indicators
CREATE TRIGGER cleanup_typing_indicators
AFTER INSERT OR UPDATE ON public.chat_typing_indicators
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_typing_indicators();