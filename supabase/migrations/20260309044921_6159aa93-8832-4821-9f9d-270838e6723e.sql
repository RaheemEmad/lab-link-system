
-- 1. Fix patient-case-photos: make bucket private and restrict SELECT to owning doctor
UPDATE storage.buckets SET public = false WHERE id = 'patient-case-photos';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Anyone can view case photos" ON storage.objects;

-- Create authenticated-only policy scoped to owning doctor
CREATE POLICY "Doctors view own case photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'patient-case-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Fix chat-attachments: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Chat attachments are publicly accessible" ON storage.objects;

CREATE POLICY "Authenticated users can view chat attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

-- Make chat-attachments bucket private  
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Make feedback-room-files bucket private (already has no public SELECT policy issue but bucket is public)
UPDATE storage.buckets SET public = false WHERE id = 'feedback-room-files';

-- 3. Fix mutable search_path on 3 SECURITY DEFINER functions
ALTER FUNCTION public.check_lab_verification_risk() SET search_path = public;
ALTER FUNCTION public.update_lab_verification() SET search_path = public;
ALTER FUNCTION public.validate_lab_pricing_on_order() SET search_path = public;

-- 4. Add auth checks to callable SECURITY DEFINER functions
-- initialize_qc_checklist: should only be callable by authenticated users
CREATE OR REPLACE FUNCTION public.initialize_qc_checklist(order_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Insert default QC checklist items
  INSERT INTO public.qc_checklist_items (order_id, item_name, item_description)
  VALUES
    (order_id_param, 'Material Quality Check', 'Verify material meets specifications and quality standards'),
    (order_id_param, 'Dimensional Accuracy', 'Check dimensions match the prescribed specifications'),
    (order_id_param, 'Shade Verification', 'Confirm shade matches the requested shade'),
    (order_id_param, 'Surface Finish', 'Inspect surface for smoothness and proper finish'),
    (order_id_param, 'Marginal Fit', 'Verify proper marginal fit and adaptation'),
    (order_id_param, 'Occlusion Check', 'Check occlusal contacts and adjustments'),
    (order_id_param, 'Final Cleaning', 'Ensure restoration is properly cleaned and polished'),
    (order_id_param, 'Packaging Inspection', 'Verify proper packaging for safe delivery');
END;
$function$;

-- complete_onboarding: should verify caller matches user_id_param
CREATE OR REPLACE FUNCTION public.complete_onboarding(user_id_param uuid, phone_param text, clinic_name_param text, specialty_param text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify caller is the same user
  IF auth.uid() IS NULL OR auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Forbidden: can only complete your own onboarding';
  END IF;

  UPDATE public.profiles
  SET 
    phone = phone_param,
    clinic_name = clinic_name_param,
    specialty = specialty_param,
    onboarding_completed = TRUE,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$function$;
