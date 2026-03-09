
-- 1. Admin Dashboard Stats RPC - consolidates 7 sequential queries into 1
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  seven_days_ago timestamptz := now() - interval '7 days';
BEGIN
  -- Only admins can call this
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'totalUsers', (SELECT count(*) FROM profiles),
    'activeUsers', (SELECT count(*) FROM profiles WHERE onboarding_completed = true),
    'totalOrders', (SELECT count(*) FROM orders),
    'pendingOrders', (SELECT count(*) FROM orders WHERE status = 'Pending'),
    'completedOrders', (SELECT count(*) FROM orders WHERE status = 'Delivered'),
    'ordersByStatus', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', s.status, 'count', s.cnt))
      FROM (SELECT status, count(*) as cnt FROM orders GROUP BY status) s
    ), '[]'::jsonb),
    'ordersByDay', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', d.day::text, 'count', d.cnt))
      FROM (
        SELECT date_trunc('day', created_at)::date as day, count(*) as cnt
        FROM orders
        WHERE created_at >= seven_days_ago
        GROUP BY day
        ORDER BY day
      ) d
    ), '[]'::jsonb),
    'roleDistribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('role', r.role::text, 'count', r.cnt))
      FROM (SELECT role, count(*) as cnt FROM user_roles GROUP BY role) r
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. Ranked Labs RPC - consolidates 5 queries into 1 server-side join
CREATE OR REPLACE FUNCTION public.get_ranked_labs(
  p_restoration_type text,
  p_urgency text DEFAULT 'Normal',
  p_user_id uuid DEFAULT NULL,
  p_limit int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(lab_row ORDER BY lab_row->>'sort_key'), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'trust_score', l.trust_score,
      'min_price_egp', l.min_price_egp,
      'max_price_egp', l.max_price_egp,
      'is_new_lab', l.is_new_lab,
      'visibility_tier', l.visibility_tier,
      'standard_sla_days', l.standard_sla_days,
      'urgent_sla_days', l.urgent_sla_days,
      'current_load', l.current_load,
      'max_capacity', l.max_capacity,
      'performance_score', l.performance_score,
      'description', l.description,
      'pricing', (
        SELECT jsonb_build_object(
          'lab_id', lp.lab_id,
          'restoration_type', lp.restoration_type,
          'fixed_price', lp.fixed_price,
          'min_price', lp.min_price,
          'max_price', lp.max_price,
          'includes_rush', lp.includes_rush,
          'rush_surcharge_percent', lp.rush_surcharge_percent
        )
        FROM lab_pricing lp
        WHERE lp.lab_id = l.id AND lp.restoration_type = p_restoration_type
        LIMIT 1
      ),
      'specialization', (
        SELECT jsonb_build_object(
          'lab_id', ls.lab_id,
          'restoration_type', ls.restoration_type::text,
          'expertise_level', ls.expertise_level::text,
          'turnaround_days', ls.turnaround_days
        )
        FROM lab_specializations ls
        WHERE ls.lab_id = l.id AND ls.restoration_type::text = p_restoration_type
        LIMIT 1
      ),
      'averageRating', (SELECT avg(rating)::numeric(3,2) FROM lab_reviews lr WHERE lr.lab_id = l.id),
      'totalReviews', (SELECT count(*) FROM lab_reviews lr WHERE lr.lab_id = l.id),
      'completedOrders', COALESCE(pm.completed_orders, 0),
      'onTimeRate', CASE WHEN COALESCE(pm.completed_orders, 0) > 0
        THEN round((pm.on_time_deliveries::numeric / pm.completed_orders) * 100, 1)
        ELSE 0 END,
      'estimatedDeliveryDays', COALESCE(
        (SELECT ls.turnaround_days FROM lab_specializations ls WHERE ls.lab_id = l.id AND ls.restoration_type::text = p_restoration_type LIMIT 1),
        CASE WHEN p_urgency = 'Urgent' THEN l.urgent_sla_days ELSE l.standard_sla_days END
      ),
      'isPreferred', (p_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM preferred_labs pl WHERE pl.lab_id = l.id AND pl.dentist_id = p_user_id
      )),
      'sort_key', lpad(
        (CASE WHEN p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM preferred_labs pl WHERE pl.lab_id = l.id AND pl.dentist_id = p_user_id)
          THEN '0' ELSE '1' END)
        || lpad((1000 - COALESCE(l.trust_score, 0)::int)::text, 4, '0')
        || CASE l.visibility_tier
          WHEN 'elite' THEN '0'
          WHEN 'trusted' THEN '1'
          WHEN 'established' THEN '2'
          ELSE '3' END,
        10, '0')
    ) as lab_row
    FROM labs l
    LEFT JOIN lab_performance_metrics pm ON pm.lab_id = l.id
    WHERE l.is_active = true
      AND l.current_load < l.max_capacity
    ORDER BY
      CASE WHEN p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM preferred_labs pl WHERE pl.lab_id = l.id AND pl.dentist_id = p_user_id) THEN 0 ELSE 1 END,
      l.trust_score DESC NULLS LAST,
      CASE l.visibility_tier WHEN 'elite' THEN 0 WHEN 'trusted' THEN 1 WHEN 'established' THEN 2 ELSE 3 END
    LIMIT p_limit
  ) sub;

  RETURN result;
END;
$$;
