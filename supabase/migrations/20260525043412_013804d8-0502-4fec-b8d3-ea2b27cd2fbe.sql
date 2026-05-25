
-- Withdrawal payment methods
CREATE TYPE public.withdrawal_method AS ENUM ('instapay', 'vodafone_cash');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method public.withdrawal_method NOT NULL,
  payout_handle TEXT NOT NULL, -- phone number or InstaPay address
  notes TEXT,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawal_requests_user ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users see their own requests
CREATE POLICY "Users view own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users create their own requests
CREATE POLICY "Users create own withdrawals"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins update (status changes)
CREATE POLICY "Admins update withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admins on new request
CREATE OR REPLACE FUNCTION public.notify_admins_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
BEGIN
  SELECT email, full_name INTO v_email, v_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.admin_notifications (title, message, severity, category, metadata)
  VALUES (
    'New Withdrawal Request',
    COALESCE(v_name, v_email, 'A user') ||
      ' has requested a withdrawal of ' || NEW.amount::text || ' EGP via ' ||
      CASE NEW.method WHEN 'instapay' THEN 'InstaPay' ELSE 'Vodafone Cash' END ||
      ' to ' || NEW.payout_handle || '. Please review and process the payout.',
    'info',
    'payment',
    jsonb_build_object(
      'withdrawal_id', NEW.id,
      'user_id', NEW.user_id,
      'user_email', v_email,
      'user_name', v_name,
      'amount', NEW.amount,
      'method', NEW.method,
      'payout_handle', NEW.payout_handle,
      'notes', NEW.notes
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_withdrawal
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_withdrawal();
