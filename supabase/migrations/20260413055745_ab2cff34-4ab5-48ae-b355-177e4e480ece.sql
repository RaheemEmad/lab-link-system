
-- Create payment_confirmations table for manual payment flow
CREATE TABLE public.payment_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  payment_method TEXT NOT NULL DEFAULT 'instapay',
  amount NUMERIC NOT NULL,
  phone_used TEXT,
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment confirmations
CREATE POLICY "Users view own payment confirmations"
ON public.payment_confirmations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own payment confirmations
CREATE POLICY "Users create own payment confirmations"
ON public.payment_confirmations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can update payment confirmations
CREATE POLICY "Admins update payment confirmations"
ON public.payment_confirmations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_payment_confirmations_updated_at
BEFORE UPDATE ON public.payment_confirmations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
