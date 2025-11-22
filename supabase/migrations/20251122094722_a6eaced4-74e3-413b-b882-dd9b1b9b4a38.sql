-- Create audit logging table for compliance and security tracking
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (for triggers and functions)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      new_values,
      metadata
    ) VALUES (
      NEW.user_id,
      'role_assigned',
      'user_roles',
      NEW.id,
      to_jsonb(NEW),
      jsonb_build_object(
        'role', NEW.role,
        'lab_id', NEW.lab_id,
        'created_by', NEW.created_by
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      old_values,
      new_values,
      metadata
    ) VALUES (
      NEW.user_id,
      'role_updated',
      'user_roles',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_lab_id', OLD.lab_id,
        'new_lab_id', NEW.lab_id
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      old_values,
      metadata
    ) VALUES (
      OLD.user_id,
      'role_removed',
      'user_roles',
      OLD.id,
      to_jsonb(OLD),
      jsonb_build_object(
        'role', OLD.role,
        'lab_id', OLD.lab_id
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields jsonb := '{}'::jsonb;
BEGIN
  -- Track which fields changed
  IF OLD.clinic_name IS DISTINCT FROM NEW.clinic_name THEN
    changed_fields := changed_fields || jsonb_build_object('clinic_name', jsonb_build_object('old', OLD.clinic_name, 'new', NEW.clinic_name));
  END IF;
  
  IF OLD.specialty IS DISTINCT FROM NEW.specialty THEN
    changed_fields := changed_fields || jsonb_build_object('specialty', jsonb_build_object('old', OLD.specialty, 'new', NEW.specialty));
  END IF;
  
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    changed_fields := changed_fields || jsonb_build_object('phone', jsonb_build_object('old', OLD.phone, 'new', NEW.phone));
  END IF;
  
  IF OLD.lab_name IS DISTINCT FROM NEW.lab_name THEN
    changed_fields := changed_fields || jsonb_build_object('lab_name', jsonb_build_object('old', OLD.lab_name, 'new', NEW.lab_name));
  END IF;
  
  IF OLD.lab_license_number IS DISTINCT FROM NEW.lab_license_number THEN
    changed_fields := changed_fields || jsonb_build_object('lab_license_number', jsonb_build_object('old', OLD.lab_license_number, 'new', NEW.lab_license_number));
  END IF;
  
  IF OLD.tax_id IS DISTINCT FROM NEW.tax_id THEN
    changed_fields := changed_fields || jsonb_build_object('tax_id', jsonb_build_object('old', OLD.tax_id, 'new', NEW.tax_id));
  END IF;
  
  IF OLD.business_address IS DISTINCT FROM NEW.business_address THEN
    changed_fields := changed_fields || jsonb_build_object('business_address', jsonb_build_object('old', OLD.business_address, 'new', NEW.business_address));
  END IF;
  
  IF OLD.onboarding_completed IS DISTINCT FROM NEW.onboarding_completed THEN
    changed_fields := changed_fields || jsonb_build_object('onboarding_completed', jsonb_build_object('old', OLD.onboarding_completed, 'new', NEW.onboarding_completed));
  END IF;
  
  -- Only log if there were actual changes to tracked fields
  IF changed_fields != '{}'::jsonb THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      old_values,
      new_values,
      metadata
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.onboarding_completed = false AND NEW.onboarding_completed = true THEN 'onboarding_completed'
        ELSE 'profile_updated'
      END,
      'profiles',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('changed_fields', changed_fields)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER audit_role_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_role_changes();

CREATE TRIGGER audit_profile_changes
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_profile_changes();

-- Helper function to log custom audit events from edge functions
CREATE OR REPLACE FUNCTION public.log_audit_event(
  action_type_param text,
  table_name_param text,
  record_id_param uuid DEFAULT NULL,
  metadata_param jsonb DEFAULT NULL,
  ip_address_param text DEFAULT NULL,
  user_agent_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    table_name,
    record_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    action_type_param,
    table_name_param,
    record_id_param,
    metadata_param,
    ip_address_param,
    user_agent_param
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;