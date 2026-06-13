
-- 1) design-files: scope lab_staff policies to assigned lab
DROP POLICY IF EXISTS "Lab staff can view design files" ON storage.objects;
DROP POLICY IF EXISTS "Lab staff can upload design files" ON storage.objects;
DROP POLICY IF EXISTS "Lab staff can update design files" ON storage.objects;
DROP POLICY IF EXISTS "Lab staff can delete design files" ON storage.objects;

CREATE POLICY "Lab staff can view design files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'design-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE (o.id)::text = (storage.foldername(objects.name))[1]
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  )
);

CREATE POLICY "Lab staff can upload design files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'design-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE (o.id)::text = (storage.foldername(name))[1]
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  )
);

CREATE POLICY "Lab staff can update design files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'design-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE (o.id)::text = (storage.foldername(objects.name))[1]
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  )
);

CREATE POLICY "Lab staff can delete design files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'design-files'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE (o.id)::text = (storage.foldername(objects.name))[1]
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  )
);

-- 2) qc-photos: scope lab_staff policies to assigned lab
DROP POLICY IF EXISTS "Lab staff can view QC photos" ON storage.objects;
DROP POLICY IF EXISTS "Lab staff can upload QC photos" ON storage.objects;
DROP POLICY IF EXISTS "Lab staff can delete QC photos" ON storage.objects;

CREATE POLICY "Lab staff can view QC photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'qc-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE (o.id)::text = (storage.foldername(objects.name))[1]
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  )
);

CREATE POLICY "Lab staff can upload QC photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qc-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE (o.id)::text = (storage.foldername(name))[1]
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  )
);

CREATE POLICY "Lab staff can delete QC photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'qc-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE (o.id)::text = (storage.foldername(objects.name))[1]
        AND ur.role = 'lab_staff'::app_role
        AND ur.lab_id = o.assigned_lab_id
    )
  )
);

-- 3) feedback-room-files: require uploader owns folder AND has access to order at folder[2]
DROP POLICY IF EXISTS "feedback_room_upload_files" ON storage.objects;

CREATE POLICY "feedback_room_upload_files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-room-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE (o.id)::text = (storage.foldername(name))[2]
      AND (
        o.doctor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.order_assignments oa
          WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
        )
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 4) order-attachments INSERT: require an order owned by the doctor exists
DROP POLICY IF EXISTS "Doctors can upload attachments for their orders" ON storage.objects;

CREATE POLICY "Doctors can upload attachments for their orders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.doctor_id = auth.uid()
  )
);

-- 5) invoice_requests UPDATE: scope lab_staff to assigned orders
DROP POLICY IF EXISTS "Staff can update invoice requests" ON public.invoice_requests;

CREATE POLICY "Staff can update invoice requests"
ON public.invoice_requests FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE o.id = invoice_requests.order_id
      AND ur.role = 'lab_staff'::app_role
      AND ur.lab_id = o.assigned_lab_id
  )
);
