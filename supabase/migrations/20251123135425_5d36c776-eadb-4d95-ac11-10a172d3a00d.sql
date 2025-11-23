-- Fix search_path for cleanup function by dropping trigger first
DROP TRIGGER IF EXISTS cleanup_typing_indicators ON public.chat_typing_indicators;
DROP FUNCTION IF EXISTS public.cleanup_old_typing_indicators() CASCADE;

CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.chat_typing_indicators
  WHERE updated_at < NOW() - INTERVAL '30 seconds'
  AND is_typing = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger
CREATE TRIGGER cleanup_typing_indicators
AFTER INSERT OR UPDATE ON public.chat_typing_indicators
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_typing_indicators();

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat attachments
CREATE POLICY "Users can upload their own chat attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat attachments for their orders"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND (
    -- Allow if user is part of the conversation (order folder matches)
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
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
  )
);

CREATE POLICY "Chat attachments are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments');