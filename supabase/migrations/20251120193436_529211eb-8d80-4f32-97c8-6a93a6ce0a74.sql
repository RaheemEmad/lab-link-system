-- Step 1: Create separate app_role enum for the new roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'lab_staff', 'doctor');

-- Step 2: Create user_roles table with proper security
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 5: RLS policies for user_roles - users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Step 6: Only admins can modify roles
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 7: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
  id,
  CASE 
    WHEN role = 'doctor' THEN 'doctor'::app_role
    WHEN role = 'lab_staff' THEN 'lab_staff'::app_role
    WHEN role = 'admin' THEN 'admin'::app_role
  END,
  created_at
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 8: Update handle_new_user to create role in user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert into profiles without role
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'doctor'::public.user_role
  );
  
  -- Insert default 'doctor' role into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'doctor'::public.app_role);
  
  RETURN NEW;
END;
$function$;

-- Step 9: Update all RLS policies to use has_role() instead of checking profiles.role

-- Update orders policies
DROP POLICY IF EXISTS "Doctors can view their own orders" ON public.orders;
CREATE POLICY "Doctors can view their own orders"
  ON public.orders
  FOR SELECT
  USING (
    auth.uid() = doctor_id OR 
    public.has_role(auth.uid(), 'lab_staff') OR 
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Lab staff can update orders" ON public.orders;
CREATE POLICY "Lab staff can update orders"
  ON public.orders
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'lab_staff') OR 
    public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Lab staff and admins can delete orders" ON public.orders;
CREATE POLICY "Lab staff and admins can delete orders"
  ON public.orders
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'lab_staff') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Update order_notes policies
DROP POLICY IF EXISTS "Users can view notes for orders they can see" ON public.order_notes;
CREATE POLICY "Users can view notes for orders they can see"
  ON public.order_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_notes.order_id
        AND (
          orders.doctor_id = auth.uid() OR
          public.has_role(auth.uid(), 'lab_staff') OR
          public.has_role(auth.uid(), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Users can create notes for orders they can access" ON public.order_notes;
CREATE POLICY "Users can create notes for orders they can access"
  ON public.order_notes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_notes.order_id
        AND (
          orders.doctor_id = auth.uid() OR
          public.has_role(auth.uid(), 'lab_staff') OR
          public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- Update order_status_history policies
DROP POLICY IF EXISTS "Users can view history for orders they can see" ON public.order_status_history;
CREATE POLICY "Users can view history for orders they can see"
  ON public.order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND (
          orders.doctor_id = auth.uid() OR
          public.has_role(auth.uid(), 'lab_staff') OR
          public.has_role(auth.uid(), 'admin')
        )
    )
  );