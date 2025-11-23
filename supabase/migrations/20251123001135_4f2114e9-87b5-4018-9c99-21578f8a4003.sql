-- Create table to track note likes
CREATE TABLE IF NOT EXISTS public.note_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.order_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(note_id, user_id)
);

-- Enable RLS
ALTER TABLE public.note_likes ENABLE ROW LEVEL SECURITY;

-- Users can like notes they can see
CREATE POLICY "Users can like notes for orders they can access"
ON public.note_likes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.order_notes
    JOIN public.orders ON orders.id = order_notes.order_id
    WHERE order_notes.id = note_likes.note_id
    AND (
      orders.doctor_id = auth.uid() OR
      has_role(auth.uid(), 'lab_staff') OR
      has_role(auth.uid(), 'admin')
    )
  )
);

-- Users can view likes for notes they can see
CREATE POLICY "Users can view likes for accessible notes"
ON public.note_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_notes
    JOIN public.orders ON orders.id = order_notes.order_id
    WHERE order_notes.id = note_likes.note_id
    AND (
      orders.doctor_id = auth.uid() OR
      has_role(auth.uid(), 'lab_staff') OR
      has_role(auth.uid(), 'admin')
    )
  )
);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can delete their own likes"
ON public.note_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_note_likes_note_id ON public.note_likes(note_id);
CREATE INDEX idx_note_likes_user_id ON public.note_likes(user_id);