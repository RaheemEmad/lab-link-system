-- Fix foreign key constraints to allow user deletion with SET NULL
-- This prevents "update or delete on table violates foreign key constraint" errors

-- 1. Fix order_status_history.changed_by
ALTER TABLE public.order_status_history 
  DROP CONSTRAINT IF EXISTS order_status_history_changed_by_fkey;

ALTER TABLE public.order_status_history 
  ADD CONSTRAINT order_status_history_changed_by_fkey 
  FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Fix user_roles.created_by
ALTER TABLE public.user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_created_by_fkey;

ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Fix qc_checklist_items.completed_by
ALTER TABLE public.qc_checklist_items 
  DROP CONSTRAINT IF EXISTS qc_checklist_items_completed_by_fkey;

ALTER TABLE public.qc_checklist_items 
  ADD CONSTRAINT qc_checklist_items_completed_by_fkey 
  FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update log_role_changes trigger to prevent FK violations during user deletion
CREATE OR REPLACE FUNCTION public.log_role_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
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
    -- Use NULL for user_id to prevent FK violation when user is being deleted
    -- Store the deleted user's ID in metadata for audit trail
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      old_values,
      metadata
    ) VALUES (
      NULL,  -- Prevents FK constraint violation
      'role_removed',
      'user_roles',
      OLD.id,
      to_jsonb(OLD),
      jsonb_build_object(
        'role', OLD.role,
        'lab_id', OLD.lab_id,
        'deleted_user_id', OLD.user_id  -- Preserve for audit trail
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;