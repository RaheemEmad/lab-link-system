
-- Feature 5: Lab Reviews Enhancement - add sub-ratings
ALTER TABLE public.lab_reviews 
  ADD COLUMN IF NOT EXISTS quality_rating integer,
  ADD COLUMN IF NOT EXISTS turnaround_rating integer,
  ADD COLUMN IF NOT EXISTS communication_rating integer;

-- Feature 6: Appointment Scheduling
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  appointment_type text NOT NULL DEFAULT 'pickup',
  scheduled_date date NOT NULL,
  time_slot_start time NOT NULL,
  time_slot_end time NOT NULL,
  location_address text,
  location_notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  confirmed_by uuid REFERENCES public.profiles(id),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Doctors can manage appointments for their orders
CREATE POLICY "Doctors manage own order appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = appointments.order_id
    AND orders.doctor_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = appointments.order_id
    AND orders.doctor_id = auth.uid()
  ));

-- Lab staff can view and manage appointments for their assigned orders
CREATE POLICY "Lab staff manage assigned order appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.order_assignments
    WHERE order_assignments.order_id = appointments.order_id
    AND order_assignments.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.order_assignments
    WHERE order_assignments.order_id = appointments.order_id
    AND order_assignments.user_id = auth.uid()
  ));

-- Admins can view all appointments
CREATE POLICY "Admins view all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
