
-- Make order-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'order-screenshots';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view order screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Order screenshots are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view order screenshots" ON storage.objects;

-- Create scoped SELECT policy
-- Files stored as: {orderId}/{filename}
CREATE POLICY "Authorized users can view order screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-screenshots'
    AND (
      -- Doctor who owns the order
      EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(name))[1]
        AND o.doctor_id = auth.uid()
      )
      -- Lab staff assigned to the order
      OR EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.labs l ON l.id = o.assigned_lab_id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE o.id::text = (storage.foldername(name))[1]
        AND p.lab_name = l.name
      )
      -- Admin
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
