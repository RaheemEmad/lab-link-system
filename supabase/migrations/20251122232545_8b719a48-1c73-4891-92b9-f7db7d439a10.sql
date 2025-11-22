-- Add screenshot_url column to orders table
ALTER TABLE public.orders ADD COLUMN screenshot_url TEXT;

-- Create storage bucket for order screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-screenshots',
  'order-screenshots',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Create RLS policies for order screenshots bucket
-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload order screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to screenshots
CREATE POLICY "Public can view order screenshots"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'order-screenshots');

-- Allow users to delete their own screenshots
CREATE POLICY "Users can delete their own screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);