
-- Create the shared trigger function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enums
CREATE TYPE public.wallet_transaction_type AS ENUM ('deposit', 'withdrawal', 'order_fee', 'refund', 'hold');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due');

-- ============ WALLETS ============
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  deposit_required_after TIMESTAMPTZ,
  deposit_amount NUMERIC NOT NULL DEFAULT 100,
  deposit_paid_at TIMESTAMPTZ,
  withdrawal_eligible_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Doctors update own wallet" ON public.wallets
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage all wallets" ON public.wallets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages wallets" ON public.wallets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WALLET TRANSACTIONS ============
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid()));
CREATE POLICY "Admins view all transactions" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages transactions" ON public.wallet_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  monthly_fee NUMERIC NOT NULL,
  per_order_fee NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ DOCTOR SUBSCRIPTIONS ============
CREATE TABLE public.doctor_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors view own subscription" ON public.doctor_subscriptions
  FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Doctors can insert own subscription" ON public.doctor_subscriptions
  FOR INSERT TO authenticated WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "Doctors can update own subscription" ON public.doctor_subscriptions
  FOR UPDATE TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Admins manage all subscriptions" ON public.doctor_subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages subscriptions" ON public.doctor_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_doctor_subscriptions_updated_at
  BEFORE UPDATE ON public.doctor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_doctor_subscriptions_doctor_id ON public.doctor_subscriptions(doctor_id);
CREATE INDEX idx_doctor_subscriptions_status ON public.doctor_subscriptions(status);
