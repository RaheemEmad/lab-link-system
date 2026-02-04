-- Allow doctors to upload files to their own folder in design-files bucket
CREATE POLICY "Doctors can upload design files for their orders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-files' AND
  has_role(auth.uid(), 'doctor'::app_role) AND
  auth.uid()::text = (storage.foldername(name))[1]
);