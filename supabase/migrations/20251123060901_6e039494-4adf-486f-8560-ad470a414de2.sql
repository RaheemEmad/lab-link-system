-- Allow lab staff to delete their own pending work requests
CREATE POLICY "Lab staff can delete their own pending requests"
ON public.lab_work_requests
FOR DELETE
USING (
  auth.uid() = requested_by_user_id 
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'lab_staff'
      AND user_roles.lab_id = lab_work_requests.lab_id
  )
);