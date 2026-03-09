CREATE OR REPLACE FUNCTION public.get_application_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'totalOrders', (SELECT count(*) FROM public.orders),
    'activeLabs', (SELECT count(*) FROM public.labs WHERE is_active = true),
    'processedCases', (SELECT count(*) FROM public.orders WHERE status = 'Delivered')
  );
$$;