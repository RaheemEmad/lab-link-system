
-- 1. Notifications: restrict INSERT to service_role only (block anon/authenticated spam)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Service role can create notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. order_assignments: scope lab_staff SELECT to their own lab's orders
DROP POLICY IF EXISTS "View assignments" ON public.order_assignments;
CREATE POLICY "View assignments"
  ON public.order_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE o.id = order_assignments.order_id
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  );

-- 3. landing_leads: allow admins to read submitted leads
DROP POLICY IF EXISTS "Admins can view leads" ON public.landing_leads;
CREATE POLICY "Admins can view leads"
  ON public.landing_leads
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Storage: fix order-attachments INSERT to verify the order in the path belongs to uploading doctor
DROP POLICY IF EXISTS "Doctors can upload attachments for their orders" ON storage.objects;
CREATE POLICY "Doctors can upload attachments for their orders"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'order-attachments'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.doctor_id = auth.uid()
        AND (o.id)::text = (storage.foldername(name))[2]
    )
  );

-- 5. Storage: fix broken labs/profiles join in order-attachments SELECT policy;
--    use order_assignments + lab_id from user_roles like the chat-attachments policy
DROP POLICY IF EXISTS "Users can view order attachment files" ON storage.objects;
CREATE POLICY "Users can view order attachment files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'order-attachments'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE (o.id)::text = (storage.foldername(objects.name))[2]
          AND o.doctor_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.user_roles ur ON ur.user_id = auth.uid()
        WHERE (o.id)::text = (storage.foldername(objects.name))[2]
          AND ur.role = 'lab_staff'::app_role
          AND ur.lab_id = o.assigned_lab_id
      )
      OR EXISTS (
        SELECT 1 FROM public.order_assignments oa
        WHERE (oa.order_id)::text = (storage.foldername(objects.name))[2]
          AND oa.user_id = auth.uid()
      )
    )
  );
