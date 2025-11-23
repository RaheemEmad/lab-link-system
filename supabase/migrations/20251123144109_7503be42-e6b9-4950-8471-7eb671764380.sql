-- Enable RLS on notification_logs table
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all notification logs
CREATE POLICY "Admins can view all notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Allow system to insert notification logs (service_role access)
CREATE POLICY "System can insert notification logs"
  ON public.notification_logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.notification_logs IS 'Tracks notification delivery status for monitoring and debugging';
COMMENT ON COLUMN public.notification_logs.status IS 'sent, failed, delayed, or retry';
COMMENT ON COLUMN public.notification_logs.retry_at IS 'When to retry failed notification';
COMMENT ON COLUMN public.notification_logs.attempt_number IS 'Current retry attempt number';