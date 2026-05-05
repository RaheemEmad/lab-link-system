ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_confirmations;
ALTER TABLE public.payment_confirmations REPLICA IDENTITY FULL;