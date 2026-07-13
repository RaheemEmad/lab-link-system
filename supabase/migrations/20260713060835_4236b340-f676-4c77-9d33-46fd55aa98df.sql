-- Public view of active labs, safe for anon (crawlers, logged-out visitors).
-- Excludes PII (contact_email, contact_phone) and sensitive risk/subscription internals.
-- Uses default SECURITY DEFINER semantics so anon can read without a base-table policy.
CREATE OR REPLACE VIEW public.labs_public AS
SELECT
  id, name, description, address, logo_url, website_url,
  is_active, is_verified, verification_status, is_sponsored, is_new_lab,
  subscription_tier, pricing_tier, pricing_mode,
  min_price_egp, max_price_egp,
  standard_sla_days, urgent_sla_days,
  trust_score, performance_score, completed_order_count,
  visibility_tier, created_at, updated_at, first_active_at
FROM public.labs
WHERE is_active = true;

REVOKE ALL ON public.labs_public FROM PUBLIC;
GRANT SELECT ON public.labs_public TO anon, authenticated;