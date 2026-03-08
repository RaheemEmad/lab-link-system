CREATE TABLE public.lab_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_bookings integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (lab_id, day_of_week, start_time)
);

ALTER TABLE public.lab_availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab staff manage own availability" ON public.lab_availability_slots
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.lab_id = lab_availability_slots.lab_id
      AND user_roles.role = 'lab_staff'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.lab_id = lab_availability_slots.lab_id
      AND user_roles.role = 'lab_staff'
  ));

CREATE POLICY "Doctors view active availability" ON public.lab_availability_slots
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage all availability" ON public.lab_availability_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));