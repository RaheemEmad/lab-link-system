-- Create order_notes table for internal comments
CREATE TABLE public.order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

-- Create index for better query performance
CREATE INDEX idx_order_notes_order_id ON public.order_notes(order_id);
CREATE INDEX idx_order_notes_created_at ON public.order_notes(created_at DESC);

-- RLS Policies for order_notes
-- Doctors can view notes for their own orders
-- Lab staff can view all notes
CREATE POLICY "Users can view notes for orders they can see"
ON public.order_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_notes.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('lab_staff', 'admin')
      )
    )
  )
);

-- Doctors can create notes for their own orders
-- Lab staff can create notes for any order
CREATE POLICY "Users can create notes for orders they can access"
ON public.order_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_notes.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('lab_staff', 'admin')
      )
    )
  )
);

-- Users can update their own notes
CREATE POLICY "Users can update their own notes"
ON public.order_notes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes"
ON public.order_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_order_notes_updated_at
BEFORE UPDATE ON public.order_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();