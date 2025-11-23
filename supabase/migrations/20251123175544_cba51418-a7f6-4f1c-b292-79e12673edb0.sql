-- Fix existing lab staff users who completed onboarding but don't have labs

-- Create labs for users who completed onboarding but have no lab
DO $$
DECLARE
  lab_user RECORD;
  new_lab_id UUID;
BEGIN
  FOR lab_user IN 
    SELECT 
      p.id as user_id,
      p.email,
      p.lab_name,
      p.phone,
      p.business_address
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'lab_staff'
      AND ur.lab_id IS NULL
      AND p.onboarding_completed = true
      AND p.lab_name IS NOT NULL
  LOOP
    -- Create a lab for this user
    INSERT INTO public.labs (
      name,
      contact_email,
      contact_phone,
      address,
      description,
      is_active
    )
    VALUES (
      lab_user.lab_name,
      lab_user.email,
      lab_user.phone,
      lab_user.business_address,
      'Lab registered via LabLink platform',
      true
    )
    RETURNING id INTO new_lab_id;
    
    -- Link the lab to the user
    UPDATE public.user_roles
    SET lab_id = new_lab_id
    WHERE user_id = lab_user.user_id AND role = 'lab_staff';
    
    RAISE NOTICE 'Created lab % for user %', new_lab_id, lab_user.user_id;
  END LOOP;
END $$;