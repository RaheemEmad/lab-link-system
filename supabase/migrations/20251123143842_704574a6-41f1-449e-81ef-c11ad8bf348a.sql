-- Performance optimization: Add database indexes for frequently queried columns
-- This significantly improves query performance for large datasets

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_doctor_id ON public.orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_lab_id ON public.orders(assigned_lab_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_auto_assign_pending ON public.orders(auto_assign_pending) WHERE auto_assign_pending = true;
CREATE INDEX IF NOT EXISTS idx_orders_status_updated_at ON public.orders(status_updated_at DESC);

-- Composite index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_orders_marketplace ON public.orders(auto_assign_pending, assigned_lab_id, created_at DESC) 
WHERE auto_assign_pending = true AND assigned_lab_id IS NULL;

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON public.chat_messages(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON public.chat_messages(read_at) WHERE read_at IS NULL;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);

-- Lab work requests indexes
CREATE INDEX IF NOT EXISTS idx_lab_work_requests_order ON public.lab_work_requests(order_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_work_requests_lab ON public.lab_work_requests(lab_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_work_requests_status ON public.lab_work_requests(status, created_at DESC);

-- Order assignments indexes
CREATE INDEX IF NOT EXISTS idx_order_assignments_order ON public.order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_user ON public.order_assignments(user_id);

-- Order notes indexes
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON public.order_notes(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_notes_user ON public.order_notes(user_id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_lab ON public.user_roles(lab_id) WHERE lab_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Order status history indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id, changed_at DESC);

-- Audit logs indexes (for admin monitoring)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action_type, created_at DESC);

-- Security alerts indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON public.security_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON public.security_alerts(resolved, created_at DESC);

-- Add notification logging table for monitoring delayed/failed notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delayed', 'retry')),
  attempt_number INTEGER DEFAULT 1,
  error_message TEXT,
  retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON public.notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_retry ON public.notification_logs(retry_at) WHERE retry_at IS NOT NULL;

-- Function to log notification delivery status
CREATE OR REPLACE FUNCTION public.log_notification_status(
  notification_id_param UUID,
  status_param TEXT,
  error_message_param TEXT DEFAULT NULL,
  retry_at_param TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  attempt_num INTEGER;
BEGIN
  -- Get current attempt number
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO attempt_num
  FROM public.notification_logs
  WHERE notification_id = notification_id_param;
  
  -- Insert log entry
  INSERT INTO public.notification_logs (
    notification_id,
    status,
    attempt_number,
    error_message,
    retry_at
  ) VALUES (
    notification_id_param,
    status_param,
    attempt_num,
    error_message_param,
    retry_at_param
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Add trigger to auto-update updated_at on notification_logs
CREATE OR REPLACE FUNCTION public.update_notification_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_notification_logs_updated_at
  BEFORE UPDATE ON public.notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_logs_updated_at();