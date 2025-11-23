-- Enhanced Audit Logging System with IP Tracking and Alerting

-- Create enum for alert severity
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create security_alerts table for real-time alerting
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity alert_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX idx_security_alerts_resolved ON public.security_alerts(resolved);
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_user_id ON public.security_alerts(user_id);

-- Create RLS policies for security_alerts
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all security alerts"
ON public.security_alerts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security alerts"
ON public.security_alerts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update security alerts"
ON public.security_alerts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enhanced audit log for sensitive data access
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  accessed_table TEXT NOT NULL,
  accessed_record_id UUID,
  access_type TEXT NOT NULL, -- 'read', 'export', 'bulk_read'
  ip_address TEXT,
  user_agent TEXT,
  query_details JSONB,
  records_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sensitive_access_user_id ON public.sensitive_data_access_log(user_id);
CREATE INDEX idx_sensitive_access_table ON public.sensitive_data_access_log(accessed_table);
CREATE INDEX idx_sensitive_access_created_at ON public.sensitive_data_access_log(created_at DESC);

ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can log sensitive data access"
ON public.sensitive_data_access_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view sensitive data access logs"
ON public.sensitive_data_access_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to create security alert
CREATE OR REPLACE FUNCTION public.create_security_alert(
  alert_type_param TEXT,
  severity_param alert_severity,
  title_param TEXT,
  description_param TEXT,
  user_id_param UUID DEFAULT NULL,
  ip_address_param TEXT DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  metadata_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO public.security_alerts (
    alert_type,
    severity,
    title,
    description,
    user_id,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    alert_type_param,
    severity_param,
    title_param,
    description_param,
    user_id_param,
    ip_address_param,
    user_agent_param,
    metadata_param
  )
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  accessed_table_param TEXT,
  access_type_param TEXT,
  accessed_record_id_param UUID DEFAULT NULL,
  records_count_param INTEGER DEFAULT 1,
  ip_address_param TEXT DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  query_details_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.sensitive_data_access_log (
    user_id,
    accessed_table,
    accessed_record_id,
    access_type,
    ip_address,
    user_agent,
    query_details,
    records_count
  ) VALUES (
    auth.uid(),
    accessed_table_param,
    accessed_record_id_param,
    access_type_param,
    ip_address_param,
    user_agent_param,
    query_details_param,
    records_count_param
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_login_pattern(
  user_email_param TEXT,
  ip_address_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_ips TEXT[];
  failed_attempts INTEGER;
  different_locations INTEGER;
BEGIN
  -- Check for multiple failed attempts
  SELECT COUNT(*) INTO failed_attempts
  FROM public.login_attempts
  WHERE email = user_email_param
  AND success = false
  AND attempted_at > NOW() - INTERVAL '1 hour';
  
  -- Check for logins from different IP addresses in short time
  SELECT COUNT(DISTINCT ip_address) INTO different_locations
  FROM public.login_attempts
  WHERE email = user_email_param
  AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  -- Alert if suspicious pattern detected
  IF failed_attempts >= 3 OR different_locations >= 3 THEN
    PERFORM public.create_security_alert(
      'suspicious_login_pattern',
      'high'::alert_severity,
      'Suspicious Login Pattern Detected',
      format('User %s has %s failed attempts and %s different IPs in short time', 
        user_email_param, failed_attempts, different_locations),
      NULL,
      ip_address_param,
      NULL,
      jsonb_build_object(
        'email', user_email_param,
        'failed_attempts', failed_attempts,
        'different_locations', different_locations
      )
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Trigger to detect suspicious patterns on login attempts
CREATE OR REPLACE FUNCTION public.monitor_login_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for suspicious patterns after each login attempt
  PERFORM public.detect_suspicious_login_pattern(NEW.email, NEW.ip_address);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_monitor_login_attempts ON public.login_attempts;
CREATE TRIGGER trigger_monitor_login_attempts
AFTER INSERT ON public.login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.monitor_login_attempts();

-- Enhanced audit log trigger for admin actions
CREATE OR REPLACE FUNCTION public.audit_admin_actions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  IF is_admin THEN
    -- Log the admin action
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      old_values,
      new_values,
      metadata
    ) VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
      jsonb_build_object(
        'operation', TG_OP,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers to monitor critical tables
DROP TRIGGER IF EXISTS trigger_audit_user_roles ON public.user_roles;
CREATE TRIGGER trigger_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_admin_actions();