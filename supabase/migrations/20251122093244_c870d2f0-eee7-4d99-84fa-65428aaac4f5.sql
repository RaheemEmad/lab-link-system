-- Update handle_new_user to NOT assign a role by default
-- Users start with no role and must complete onboarding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles without role or onboarding completion
  INSERT INTO public.profiles (id, email, full_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    FALSE
  );
  
  -- Do NOT insert a default role - users must choose during onboarding
  
  RETURN NEW;
END;
$function$;

-- Create function to set user role (can only be called once per user)
CREATE OR REPLACE FUNCTION public.set_user_role(
  user_id_param UUID,
  role_param app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user already has a role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = user_id_param) THEN
    RAISE EXCEPTION 'User already has a role assigned';
  END IF;
  
  -- Validate role is either doctor or lab_staff (not admin)
  IF role_param NOT IN ('doctor', 'lab_staff') THEN
    RAISE EXCEPTION 'Invalid role. Must be doctor or lab_staff';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id_param, role_param);
END;
$function$;

-- Update complete_onboarding to be role-specific
CREATE OR REPLACE FUNCTION public.complete_doctor_onboarding(
  user_id_param UUID,
  phone_param TEXT,
  clinic_name_param TEXT,
  specialty_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user has doctor role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_id_param AND role = 'doctor'
  ) THEN
    RAISE EXCEPTION 'User must have doctor role to complete doctor onboarding';
  END IF;
  
  -- Update profile with doctor-specific data
  UPDATE public.profiles
  SET 
    phone = phone_param,
    clinic_name = clinic_name_param,
    specialty = specialty_param,
    onboarding_completed = TRUE,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$function$;

-- Add lab-specific columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS lab_name TEXT,
ADD COLUMN IF NOT EXISTS lab_license_number TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT;

-- Create function for lab onboarding
CREATE OR REPLACE FUNCTION public.complete_lab_onboarding(
  user_id_param UUID,
  phone_param TEXT,
  lab_name_param TEXT,
  lab_license_param TEXT,
  tax_id_param TEXT,
  address_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user has lab_staff role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_id_param AND role = 'lab_staff'
  ) THEN
    RAISE EXCEPTION 'User must have lab_staff role to complete lab onboarding';
  END IF;
  
  -- Update profile with lab-specific data
  UPDATE public.profiles
  SET 
    phone = phone_param,
    lab_name = lab_name_param,
    lab_license_number = lab_license_param,
    tax_id = tax_id_param,
    business_address = address_param,
    onboarding_completed = TRUE,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$function$;