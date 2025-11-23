-- FIX 1: Restrict public access to sensitive lab data
-- Remove public SELECT policies and add authenticated-only access

-- Labs table: Only authenticated users can view labs
DROP POLICY IF EXISTS "Everyone can view active labs" ON public.labs;

CREATE POLICY "Authenticated users can view active labs" 
ON public.labs 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Lab reviews: Only authenticated users can view
DROP POLICY IF EXISTS "Everyone can view lab reviews" ON public.lab_reviews;

CREATE POLICY "Authenticated users can view lab reviews" 
ON public.lab_reviews 
FOR SELECT 
TO authenticated
USING (true);

-- Lab performance metrics: Only authenticated users can view
DROP POLICY IF EXISTS "Everyone can view lab performance" ON public.lab_performance_metrics;

CREATE POLICY "Authenticated users can view lab performance" 
ON public.lab_performance_metrics 
FOR SELECT 
TO authenticated
USING (true);

-- Lab specializations: Only authenticated users can view
DROP POLICY IF EXISTS "Everyone can view lab specializations" ON public.lab_specializations;

CREATE POLICY "Authenticated users can view lab specializations" 
ON public.lab_specializations 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM labs 
  WHERE labs.id = lab_specializations.lab_id 
  AND labs.is_active = true
));

-- Lab photos: Only authenticated users can view
DROP POLICY IF EXISTS "Everyone can view lab photos" ON public.lab_photos;

CREATE POLICY "Authenticated users can view lab photos" 
ON public.lab_photos 
FOR SELECT 
TO authenticated
USING (true);