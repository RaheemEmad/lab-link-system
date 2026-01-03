-- Add 'Cancelled' status to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'Cancelled';

-- Create order_cancellations table for tracking cancellations
CREATE TABLE public.order_cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cancelled_by UUID NOT NULL,
  cancelled_by_role TEXT NOT NULL CHECK (cancelled_by_role IN ('doctor', 'lab')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_cancellations
CREATE POLICY "Users can view cancellations for their orders"
ON public.order_cancellations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_cancellations.order_id
    AND (o.doctor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR 
         (has_role(auth.uid(), 'lab_staff'::app_role) AND EXISTS (
           SELECT 1 FROM order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
         )))
  )
);

CREATE POLICY "Users can create cancellations for their orders"
ON public.order_cancellations FOR INSERT
WITH CHECK (
  cancelled_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_cancellations.order_id
    AND (
      (cancelled_by_role = 'doctor' AND o.doctor_id = auth.uid()) OR
      (cancelled_by_role = 'lab' AND has_role(auth.uid(), 'lab_staff'::app_role) AND EXISTS (
        SELECT 1 FROM order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
      ))
    )
  )
);

-- Extend lab_performance_metrics with new columns
ALTER TABLE public.lab_performance_metrics 
ADD COLUMN IF NOT EXISTS cancelled_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_lead_time_hours NUMERIC,
ADD COLUMN IF NOT EXISTS time_accuracy_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS cancellation_rate NUMERIC DEFAULT 0;

-- Extend labs table with subscription/sponsored columns
ALTER TABLE public.labs
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_visible BOOLEAN DEFAULT false;

-- Create lab_badges table
CREATE TABLE public.lab_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('fast_delivery', 'slow_delivery', 'high_rating', 'low_rating', 'reliable', 'unreliable', 'verified', 'top_performer')),
  badge_value TEXT NOT NULL CHECK (badge_value IN ('positive', 'negative')),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(lab_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.lab_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for lab_badges
CREATE POLICY "Anyone can view lab badges"
ON public.lab_badges FOR SELECT
USING (true);

CREATE POLICY "System can manage lab badges"
ON public.lab_badges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create lab_portfolio_items table
CREATE TABLE public.lab_portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  restoration_type TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,
  before_image_url TEXT,
  after_image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_portfolio_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for lab_portfolio_items
CREATE POLICY "Anyone can view portfolio items"
ON public.lab_portfolio_items FOR SELECT
USING (true);

CREATE POLICY "Lab staff can manage their portfolio"
ON public.lab_portfolio_items FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'lab_staff' AND ur.lab_id = lab_portfolio_items.lab_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'lab_staff' AND ur.lab_id = lab_portfolio_items.lab_id
  )
);

-- Create lab_subscription_packages table
CREATE TABLE public.lab_subscription_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_monthly NUMERIC NOT NULL,
  max_cancellations_per_month INTEGER DEFAULT 5,
  sponsored_placement BOOLEAN DEFAULT false,
  priority_in_auto_assign BOOLEAN DEFAULT false,
  portfolio_limit INTEGER DEFAULT 5,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_subscription_packages ENABLE ROW LEVEL SECURITY;

-- RLS policy for packages (readable by all)
CREATE POLICY "Anyone can view subscription packages"
ON public.lab_subscription_packages FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage packages"
ON public.lab_subscription_packages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default packages
INSERT INTO public.lab_subscription_packages (name, price_monthly, max_cancellations_per_month, sponsored_placement, priority_in_auto_assign, portfolio_limit, features)
VALUES 
  ('basic', 0, 3, false, false, 5, '{"badge_display": true}'::jsonb),
  ('premium', 99, 10, true, true, 20, '{"badge_display": true, "analytics": true, "priority_support": true}'::jsonb);

-- Create function to calculate lab metrics
CREATE OR REPLACE FUNCTION public.calculate_lab_metrics(p_lab_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_orders INTEGER;
  v_completed_orders INTEGER;
  v_on_time_deliveries INTEGER;
  v_cancelled_orders INTEGER;
  v_avg_turnaround NUMERIC;
  v_avg_lead_time NUMERIC;
  v_cancellation_rate NUMERIC;
  v_time_accuracy NUMERIC;
BEGIN
  -- Calculate metrics from orders
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Delivered'),
    COUNT(*) FILTER (WHERE status = 'Delivered' AND actual_delivery_date <= expected_delivery_date),
    COUNT(*) FILTER (WHERE status = 'Cancelled'),
    AVG(EXTRACT(EPOCH FROM (actual_delivery_date::timestamp - created_at)) / 86400) FILTER (WHERE status = 'Delivered'),
    AVG(EXTRACT(EPOCH FROM (actual_delivery_date::timestamp - status_updated_at)) / 3600) FILTER (WHERE status = 'Delivered')
  INTO v_total_orders, v_completed_orders, v_on_time_deliveries, v_cancelled_orders, v_avg_turnaround, v_avg_lead_time
  FROM orders
  WHERE assigned_lab_id = p_lab_id;

  -- Calculate rates
  IF v_total_orders > 0 THEN
    v_cancellation_rate := (v_cancelled_orders::NUMERIC / v_total_orders) * 100;
  ELSE
    v_cancellation_rate := 0;
  END IF;

  IF v_completed_orders > 0 THEN
    v_time_accuracy := (v_on_time_deliveries::NUMERIC / v_completed_orders) * 100;
  ELSE
    v_time_accuracy := 100;
  END IF;

  -- Upsert metrics
  INSERT INTO lab_performance_metrics (
    lab_id, total_orders, completed_orders, on_time_deliveries, 
    cancelled_orders, average_turnaround_days, average_lead_time_hours,
    cancellation_rate, time_accuracy_percentage, last_calculated_at
  )
  VALUES (
    p_lab_id, v_total_orders, v_completed_orders, v_on_time_deliveries,
    v_cancelled_orders, v_avg_turnaround, v_avg_lead_time,
    v_cancellation_rate, v_time_accuracy, now()
  )
  ON CONFLICT (lab_id) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    completed_orders = EXCLUDED.completed_orders,
    on_time_deliveries = EXCLUDED.on_time_deliveries,
    cancelled_orders = EXCLUDED.cancelled_orders,
    average_turnaround_days = EXCLUDED.average_turnaround_days,
    average_lead_time_hours = EXCLUDED.average_lead_time_hours,
    cancellation_rate = EXCLUDED.cancellation_rate,
    time_accuracy_percentage = EXCLUDED.time_accuracy_percentage,
    last_calculated_at = now();

  -- Update cancellation visibility (after 5 cancellations)
  UPDATE labs SET cancellation_visible = true
  WHERE id = p_lab_id AND v_cancelled_orders >= 5;

  -- Auto-assign badges based on thresholds
  -- High rating badge (>= 4.5)
  IF EXISTS (SELECT 1 FROM labs WHERE id = p_lab_id AND performance_score >= 4.5) THEN
    INSERT INTO lab_badges (lab_id, badge_type, badge_value)
    VALUES (p_lab_id, 'high_rating', 'positive')
    ON CONFLICT (lab_id, badge_type) DO UPDATE SET earned_at = now();
  END IF;

  -- Low rating badge (< 3.0)
  IF EXISTS (SELECT 1 FROM labs WHERE id = p_lab_id AND performance_score < 3.0) THEN
    INSERT INTO lab_badges (lab_id, badge_type, badge_value)
    VALUES (p_lab_id, 'low_rating', 'negative')
    ON CONFLICT (lab_id, badge_type) DO UPDATE SET earned_at = now();
  END IF;

  -- Reliable badge (cancellation rate < 2%)
  IF v_cancellation_rate < 2 AND v_total_orders >= 10 THEN
    INSERT INTO lab_badges (lab_id, badge_type, badge_value)
    VALUES (p_lab_id, 'reliable', 'positive')
    ON CONFLICT (lab_id, badge_type) DO UPDATE SET earned_at = now();
  END IF;

  -- Unreliable badge (cancellation rate > 10%)
  IF v_cancellation_rate > 10 THEN
    INSERT INTO lab_badges (lab_id, badge_type, badge_value)
    VALUES (p_lab_id, 'unreliable', 'negative')
    ON CONFLICT (lab_id, badge_type) DO UPDATE SET earned_at = now();
  END IF;

  -- Fast delivery badge (avg lead time < 72 hours / 3 days)
  IF v_avg_lead_time IS NOT NULL AND v_avg_lead_time < 72 THEN
    INSERT INTO lab_badges (lab_id, badge_type, badge_value)
    VALUES (p_lab_id, 'fast_delivery', 'positive')
    ON CONFLICT (lab_id, badge_type) DO UPDATE SET earned_at = now();
  END IF;

END;
$$;

-- Create trigger to recalculate metrics on order status change
CREATE OR REPLACE FUNCTION public.trigger_recalculate_lab_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_lab_id IS NOT NULL THEN
    PERFORM calculate_lab_metrics(NEW.assigned_lab_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recalculate_lab_metrics_on_order_update
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trigger_recalculate_lab_metrics();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE lab_badges;
ALTER PUBLICATION supabase_realtime ADD TABLE lab_portfolio_items;