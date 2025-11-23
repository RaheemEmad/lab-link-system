-- Fix lab onboarding to create lab entity and link user properly

-- Drop the old function
DROP FUNCTION IF EXISTS public.complete_lab_onboarding(uuid, text, text, text, text, text);

-- Create updated function that creates a lab and links the user
CREATE OR REPLACE FUNCTION public.complete_lab_onboarding(
  user_id_param UUID,
  phone_param TEXT,
  lab_name_param TEXT,
  lab_license_param TEXT,
  tax_id_param TEXT,
  address_param TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_lab_id UUID;
BEGIN
  -- Verify user has lab_staff role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_id_param AND role = 'lab_staff'
  ) THEN
    RAISE EXCEPTION 'User must have lab_staff role to complete lab onboarding';
  END IF;
  
  -- Create a new lab in the labs table
  INSERT INTO public.labs (
    name,
    contact_email,
    contact_phone,
    address,
    description,
    is_active
  )
  VALUES (
    lab_name_param,
    (SELECT email FROM public.profiles WHERE id = user_id_param),
    phone_param,
    address_param,
    'Lab registered via LabLink platform',
    true
  )
  RETURNING id INTO new_lab_id;
  
  -- Update user_roles to link user to the lab
  UPDATE public.user_roles
  SET lab_id = new_lab_id
  WHERE user_id = user_id_param AND role = 'lab_staff';
  
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
  
  -- Return the new lab ID
  RETURN new_lab_id;
END;
$$;