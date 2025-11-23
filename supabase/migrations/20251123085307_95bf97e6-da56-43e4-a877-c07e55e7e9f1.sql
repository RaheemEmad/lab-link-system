-- Allow lab staff to update their lab profile
CREATE POLICY "Lab staff can update their lab profile"
ON public.labs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND user_roles.lab_id = labs.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND user_roles.lab_id = labs.id
  )
);