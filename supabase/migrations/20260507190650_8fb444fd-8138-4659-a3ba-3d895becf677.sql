
-- Notification preferences per user, per event category, per channel
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  in_app BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own prefs" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own prefs" ON public.notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for payment-notification triggers
CREATE TABLE public.payment_notification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_confirmation_id UUID,
  recipient_user_id UUID NOT NULL,
  recipient_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  triggered_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_notification_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view payment audit" ON public.payment_notification_audit
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System insert payment audit" ON public.payment_notification_audit
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_payment_audit_created_at ON public.payment_notification_audit (created_at DESC);
CREATE INDEX idx_payment_audit_recipient ON public.payment_notification_audit (recipient_user_id);

-- 90-day auto-purge function (can be invoked via pg_cron later if desired)
CREATE OR REPLACE FUNCTION public.purge_old_payment_notification_audit()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.payment_notification_audit
  WHERE created_at < now() - INTERVAL '90 days';
$$;
