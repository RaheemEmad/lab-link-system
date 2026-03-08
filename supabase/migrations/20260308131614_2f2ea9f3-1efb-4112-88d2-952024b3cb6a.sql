ALTER TABLE public.lab_reviews
  ADD COLUMN IF NOT EXISTS value_rating integer,
  ADD COLUMN IF NOT EXISTS accuracy_rating integer;