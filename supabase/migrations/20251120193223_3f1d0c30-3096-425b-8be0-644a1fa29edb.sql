-- Update handle_new_user function to always default to 'doctor' role
-- This ignores any client-supplied role data to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'doctor'::public.user_role  -- Always default to 'doctor', ignore client input
  );
  RETURN NEW;
END;
$function$;