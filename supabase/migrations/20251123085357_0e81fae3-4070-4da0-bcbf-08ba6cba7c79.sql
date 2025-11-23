-- Create storage bucket for lab logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-logos',
  'lab-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Allow authenticated users to upload their lab logos
CREATE POLICY "Lab staff can upload their lab logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
  )
);

-- Allow authenticated users to update their lab logos
CREATE POLICY "Lab staff can update their lab logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lab-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
  )
);

-- Allow authenticated users to delete their lab logos
CREATE POLICY "Lab staff can delete their lab logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
  )
);

-- Allow everyone to view lab logos (public bucket)
CREATE POLICY "Anyone can view lab logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'lab-logos');