
-- Add photos jsonb column to patient_cases
ALTER TABLE public.patient_cases ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- Create patient-case-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patient-case-photos', 'patient-case-photos', true, 10485760, 
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS: doctors upload to their own folder
CREATE POLICY "Doctors upload own case photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-case-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: doctors delete their own case photos
CREATE POLICY "Doctors delete own case photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'patient-case-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: anyone can view case photos (public bucket)
CREATE POLICY "Anyone can view case photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'patient-case-photos');
