
-- Feature 1: Patient Case Library
CREATE TABLE public.patient_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  restoration_type text NOT NULL,
  teeth_number text NOT NULL,
  teeth_shade text NOT NULL,
  shade_system text,
  biological_notes text,
  preferred_lab_id uuid REFERENCES public.labs(id),
  photos_link text,
  last_order_id uuid REFERENCES public.orders(id),
  order_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.patient_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own cases" ON public.patient_cases
  FOR ALL TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Feature 3: Lab Inventory Tracker
CREATE TABLE public.lab_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  current_stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'units',
  minimum_stock numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric,
  supplier_name text,
  last_restocked_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lab_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab staff manage own inventory" ON public.lab_inventory
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_inventory.lab_id 
    AND user_roles.role = 'lab_staff'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_inventory.lab_id 
    AND user_roles.role = 'lab_staff'
  ));

CREATE POLICY "Admins view all inventory" ON public.lab_inventory
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
