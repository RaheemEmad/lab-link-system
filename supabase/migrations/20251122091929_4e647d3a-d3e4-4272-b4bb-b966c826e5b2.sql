-- Fix handle_new_user function to remove invalid role column reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles without role (role is stored in user_roles table)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Insert default 'doctor' role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'doctor'::public.app_role);
  
  RETURN NEW;
END;
$function$;