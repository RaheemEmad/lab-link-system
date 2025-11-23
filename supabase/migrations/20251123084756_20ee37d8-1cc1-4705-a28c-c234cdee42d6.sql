-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage lab specializations" ON public.lab_specializations;

-- Allow admins to manage all lab specializations
CREATE POLICY "Admins can manage all lab specializations"
ON public.lab_specializations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow lab staff to insert specializations for their own lab
CREATE POLICY "Lab staff can insert their lab specializations"
ON public.lab_specializations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND user_roles.lab_id = lab_specializations.lab_id
  )
);

-- Allow lab staff to update specializations for their own lab
CREATE POLICY "Lab staff can update their lab specializations"
ON public.lab_specializations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND user_roles.lab_id = lab_specializations.lab_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND user_roles.lab_id = lab_specializations.lab_id
  )
);

-- Allow lab staff to delete specializations for their own lab
CREATE POLICY "Lab staff can delete their lab specializations"
ON public.lab_specializations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND user_roles.lab_id = lab_specializations.lab_id
  )
);