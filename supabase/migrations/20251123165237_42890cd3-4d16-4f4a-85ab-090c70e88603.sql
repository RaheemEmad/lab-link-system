-- Create function to check OAuth rate limiting
CREATE OR REPLACE FUNCTION public.check_oauth_rate_limit(
  ip_address_param text,
  email_param text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts integer;
  lockout_duration interval := '15 minutes';
  max_attempts integer := 5;
  lockout_end timestamp with time zone;
BEGIN
  -- Count failed OAuth attempts in the last lockout_duration
  SELECT COUNT(*), MAX(attempted_at) + lockout_duration
  INTO failed_attempts, lockout_end
  FROM public.login_attempts
  WHERE ip_address = ip_address_param
    AND success = false
    AND attempted_at > now() - lockout_duration
    AND (email_param IS NULL OR email = email_param);
  
  -- If no failed attempts, account is not locked
  IF failed_attempts IS NULL OR failed_attempts = 0 THEN
    RETURN jsonb_build_object(
      'is_locked', false,
      'attempts', 0,
      'max_attempts', max_attempts
    );
  END IF;
  
  -- Check if max attempts exceeded and still within lockout window
  IF failed_attempts >= max_attempts AND lockout_end > now() THEN
    RETURN jsonb_build_object(
      'is_locked', true,
      'attempts', failed_attempts,
      'max_attempts', max_attempts,
      'lockout_end', lockout_end,
      'retry_after_seconds', EXTRACT(EPOCH FROM (lockout_end - now()))::integer
    );
  END IF;
  
  RETURN jsonb_build_object(
    'is_locked', false,
    'attempts', failed_attempts,
    'max_attempts', max_attempts
  );
END;
$$;

-- Create function to log OAuth attempts
CREATE OR REPLACE FUNCTION public.log_oauth_attempt(
  email_param text,
  success_param boolean,
  ip_address_param text,
  user_agent_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_id uuid;
BEGIN
  INSERT INTO public.login_attempts (
    email,
    success,
    ip_address,
    user_agent,
    attempted_at
  ) VALUES (
    email_param,
    success_param,
    ip_address_param,
    user_agent_param,
    now()
  )
  RETURNING id INTO attempt_id;
  
  RETURN attempt_id;
END;
$$;