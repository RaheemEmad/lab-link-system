-- Add trust-based ordering fields to labs table
ALTER TABLE public.labs 
ADD COLUMN IF NOT EXISTS trust_score NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS min_price_egp NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_price_egp NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_new_lab BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS first_active_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visibility_tier TEXT DEFAULT 'emerging' CHECK (visibility_tier IN ('emerging', 'established', 'trusted', 'elite'));

-- Create lab_pricing table for fixed/range pricing per restoration type
CREATE TABLE IF NOT EXISTS public.lab_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  restoration_type TEXT NOT NULL,
  fixed_price NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  includes_rush BOOLEAN DEFAULT false,
  rush_surcharge_percent INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lab_id, restoration_type)
);

-- Enable RLS on lab_pricing
ALTER TABLE public.lab_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for lab_pricing - labs can manage their own pricing, everyone can read
CREATE POLICY "Anyone can view lab pricing"
ON public.lab_pricing FOR SELECT
USING (true);

CREATE POLICY "Labs can manage their own pricing"
ON public.lab_pricing FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.lab_id = lab_pricing.lab_id 
    AND ur.role = 'lab_staff'
  )
);

-- Add flow_mode and selected_from_rank to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS flow_mode TEXT DEFAULT 'trust_recommended' CHECK (flow_mode IN ('trust_recommended', 'compare_options', 'open_market')),
ADD COLUMN IF NOT EXISTS selected_from_rank INTEGER;

-- Create function to calculate lab trust score
CREATE OR REPLACE FUNCTION public.calculate_lab_trust_score(p_lab_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_sla_score NUMERIC := 0;
  v_quality_score NUMERIC := 0;
  v_experience_score NUMERIC := 0;
  v_dispute_score NUMERIC := 0;
  v_total_score NUMERIC := 0;
  v_metrics RECORD;
  v_avg_rating NUMERIC;
BEGIN
  -- Get performance metrics
  SELECT * INTO v_metrics FROM lab_performance_metrics WHERE lab_id = p_lab_id;
  
  -- SLA Compliance (30% weight) - on-time delivery rate
  IF v_metrics IS NOT NULL AND v_metrics.completed_orders > 0 THEN
    v_sla_score := (v_metrics.on_time_deliveries::NUMERIC / v_metrics.completed_orders) * 5 * 0.30;
  END IF;
  
  -- Quality Rating (25% weight) - average review rating
  SELECT AVG(rating) INTO v_avg_rating FROM lab_reviews WHERE lab_id = p_lab_id;
  IF v_avg_rating IS NOT NULL THEN
    v_quality_score := v_avg_rating * 0.25;
  END IF;
  
  -- Experience (20% weight) - log scale of completed orders
  IF v_metrics IS NOT NULL AND v_metrics.completed_orders > 0 THEN
    v_experience_score := LEAST(LOG(v_metrics.completed_orders + 1) / LOG(500), 1) * 5 * 0.20;
  END IF;
  
  -- Dispute/Cancel Rate (25% weight) - inverse of cancellation rate
  IF v_metrics IS NOT NULL THEN
    v_dispute_score := (1 - COALESCE(v_metrics.cancellation_rate, 0)) * 5 * 0.25;
  ELSE
    v_dispute_score := 5 * 0.25; -- Default to perfect if no data
  END IF;
  
  v_total_score := v_sla_score + v_quality_score + v_experience_score + v_dispute_score;
  
  -- Update the lab's trust_score
  UPDATE labs SET trust_score = ROUND(v_total_score, 2) WHERE id = p_lab_id;
  
  RETURN ROUND(v_total_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update visibility tier based on metrics
CREATE OR REPLACE FUNCTION public.update_lab_visibility_tier(p_lab_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT := 'emerging';
  v_metrics RECORD;
  v_trust_score NUMERIC;
  v_days_active INTEGER;
BEGIN
  SELECT * INTO v_metrics FROM lab_performance_metrics WHERE lab_id = p_lab_id;
  SELECT trust_score, EXTRACT(DAY FROM (now() - first_active_at))::INTEGER
    INTO v_trust_score, v_days_active
    FROM labs WHERE id = p_lab_id;
  
  IF v_metrics IS NULL THEN
    v_tier := 'emerging';
  ELSIF v_metrics.completed_orders >= 200 AND v_trust_score >= 4.5 AND COALESCE(v_metrics.cancellation_rate, 0) < 0.02 THEN
    v_tier := 'elite';
  ELSIF v_metrics.completed_orders >= 51 AND v_trust_score >= 4.0 THEN
    v_tier := 'trusted';
  ELSIF v_metrics.completed_orders >= 10 AND v_trust_score >= 3.5 THEN
    v_tier := 'established';
  ELSE
    v_tier := 'emerging';
  END IF;
  
  UPDATE labs SET 
    visibility_tier = v_tier,
    is_new_lab = (v_days_active IS NULL OR v_days_active < 60)
  WHERE id = p_lab_id;
  
  RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to recalculate trust score when orders complete
CREATE OR REPLACE FUNCTION public.trigger_recalc_trust_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    IF NEW.assigned_lab_id IS NOT NULL THEN
      PERFORM calculate_lab_trust_score(NEW.assigned_lab_id);
      PERFORM update_lab_visibility_tier(NEW.assigned_lab_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS recalc_trust_score_on_order ON public.orders;
CREATE TRIGGER recalc_trust_score_on_order
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_trust_score();

-- Create index for faster trust-based queries
CREATE INDEX IF NOT EXISTS idx_labs_trust_score ON public.labs(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_labs_visibility_tier ON public.labs(visibility_tier);
CREATE INDEX IF NOT EXISTS idx_lab_pricing_lab_restoration ON public.lab_pricing(lab_id, restoration_type);