-- Create admin_notifications table for system alerts
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can update (mark as read)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_admin_notifications_read ON public.admin_notifications(read);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_severity ON public.admin_notifications(severity);

-- Function to create admin notification
CREATE OR REPLACE FUNCTION public.create_admin_notification(
  title_param TEXT,
  message_param TEXT,
  severity_param TEXT,
  category_param TEXT,
  metadata_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.admin_notifications (title, message, severity, category, metadata)
  VALUES (title_param, message_param, severity_param, category_param, metadata_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger to notify admins when orders fail or get stuck
CREATE OR REPLACE FUNCTION public.monitor_stuck_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify if order is pending for more than 24 hours
  IF NEW.status = 'Pending' AND (NOW() - NEW.created_at) > INTERVAL '24 hours' THEN
    PERFORM public.create_admin_notification(
      'Stuck Order Alert',
      'Order ' || NEW.order_number || ' has been pending for over 24 hours',
      'warning',
      'stuck_order',
      jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to monitor suspicious login activity
CREATE OR REPLACE FUNCTION public.monitor_failed_logins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_failures INT;
BEGIN
  -- Count failed attempts in last hour
  SELECT COUNT(*) INTO recent_failures
  FROM public.login_attempts
  WHERE email = NEW.email
  AND success = false
  AND attempted_at > NOW() - INTERVAL '1 hour';
  
  -- Alert if more than 5 failed attempts
  IF recent_failures >= 5 THEN
    PERFORM public.create_admin_notification(
      'Suspicious Login Activity',
      'Multiple failed login attempts detected for ' || NEW.email,
      'error',
      'security',
      jsonb_build_object('email', NEW.email, 'attempts', recent_failures, 'ip', NEW.ip_address)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER monitor_failed_logins_trigger
AFTER INSERT ON public.login_attempts
FOR EACH ROW
WHEN (NEW.success = false)
EXECUTE FUNCTION public.monitor_failed_logins();