-- Create chat messages table for real-time communication between doctors and labs
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('doctor', 'lab_staff')),
  message_text TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow doctors and lab staff to view messages for their orders
CREATE POLICY "Users can view messages for their orders"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = chat_messages.order_id
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

-- Allow doctors and lab staff to insert messages for their orders
CREATE POLICY "Users can insert messages for their orders"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = chat_messages.order_id
    AND (
      (sender_role = 'doctor' AND o.doctor_id = auth.uid())
      OR (sender_role = 'lab_staff' AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'lab_staff'
        AND ur.lab_id = o.assigned_lab_id
      ))
    )
  )
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_order_id ON public.chat_messages(order_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_chat_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_message_updated_at();