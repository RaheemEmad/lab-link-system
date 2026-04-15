-- Fix order-attachments storage SELECT policy
-- Drop the overly broad policy created in the previous migration attempt
DROP POLICY IF EXISTS "Users can view order attachment files" ON storage.objects;

-- Also drop the original broad policy if it still exists
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;

-- Create properly scoped policy
-- Files are stored as: {userId}/{orderId}/{fileId}-{filename}
-- foldername(name)[1] = userId, foldername(name)[2] = orderId
CREATE POLICY "Users can view order attachment files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-attachments'
    AND (
      -- File uploader can always view their own uploads
      auth.uid()::text = (storage.foldername(name))[1]
      -- Doctor who owns the order can view all its attachments
      OR EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id::text = (storage.foldername(name))[2]
        AND o.doctor_id = auth.uid()
      )
      -- Lab staff whose lab is assigned to the order
      OR EXISTS (
        SELECT 1 FROM orders o
        JOIN labs l ON l.id = o.assigned_lab_id
        JOIN profiles p ON p.id = auth.uid()
        WHERE o.id::text = (storage.foldername(name))[2]
        AND p.lab_name = l.name
        AND has_role(auth.uid(), 'lab_staff'::app_role)
      )
      -- Admin access
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );
