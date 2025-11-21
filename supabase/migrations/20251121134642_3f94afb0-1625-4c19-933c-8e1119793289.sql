-- Add onboarding tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS clinic_name TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Create a function to mark onboarding as complete
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  user_id_param UUID,
  phone_param TEXT,
  clinic_name_param TEXT,
  specialty_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    phone = phone_param,
    clinic_name = clinic_name_param,
    specialty = specialty_param,
    onboarding_completed = TRUE,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$$;