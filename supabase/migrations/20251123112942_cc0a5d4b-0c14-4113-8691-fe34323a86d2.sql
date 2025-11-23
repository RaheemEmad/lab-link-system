-- Create table to track login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts(attempted_at);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempts
CREATE POLICY "Only admins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert login attempts
CREATE POLICY "System can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts INT;
  last_failed_attempt TIMESTAMP WITH TIME ZONE;
  lockout_duration INTERVAL := '30 minutes';
  max_attempts INT := 5;
BEGIN
  -- Count failed attempts in the last lockout_duration
  SELECT COUNT(*), MAX(attempted_at)
  INTO failed_attempts, last_failed_attempt
  FROM public.login_attempts
  WHERE email = user_email
    AND success = false
    AND attempted_at > now() - lockout_duration;
  
  -- If no failed attempts, account is not locked
  IF failed_attempts IS NULL OR failed_attempts = 0 THEN
    RETURN false;
  END IF;
  
  -- Check if max attempts exceeded and still within lockout window
  IF failed_attempts >= max_attempts AND last_failed_attempt > now() - lockout_duration THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to clean up old login attempts (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - INTERVAL '30 days';
END;
$$;