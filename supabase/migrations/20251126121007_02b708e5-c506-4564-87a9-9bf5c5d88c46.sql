-- Create function to unlock user accounts by clearing failed login attempts
CREATE OR REPLACE FUNCTION public.unlock_account(user_email_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete all failed login attempts for the user
  DELETE FROM public.login_attempts
  WHERE email = LOWER(user_email_param);
  
  -- Log the unlock action
  INSERT INTO public.audit_logs (
    action_type,
    table_name,
    metadata
  ) VALUES (
    'account_unlocked',
    'login_attempts',
    jsonb_build_object(
      'email', user_email_param,
      'unlocked_by', auth.uid()
    )
  );
END;
$$;