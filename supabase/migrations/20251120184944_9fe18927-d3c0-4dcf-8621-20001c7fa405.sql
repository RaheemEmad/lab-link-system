-- Add UPDATE policy for doctors to edit their own orders
CREATE POLICY "Doctors can update their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- Add DELETE policy for doctors to delete their own orders
CREATE POLICY "Doctors can delete their own orders"
ON public.orders
FOR DELETE
USING (auth.uid() = doctor_id);

-- Lab staff and admins can also delete orders
CREATE POLICY "Lab staff and admins can delete orders"
ON public.orders
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('lab_staff', 'admin')
  )
);