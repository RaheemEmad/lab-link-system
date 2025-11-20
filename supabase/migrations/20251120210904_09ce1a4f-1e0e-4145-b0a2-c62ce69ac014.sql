-- Create pricing tier enum
CREATE TYPE public.pricing_tier AS ENUM ('budget', 'standard', 'premium');

-- Create expertise level enum
CREATE TYPE public.expertise_level AS ENUM ('basic', 'intermediate', 'expert');

-- Create labs table
CREATE TABLE public.labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_capacity INTEGER NOT NULL DEFAULT 10,
  current_load INTEGER NOT NULL DEFAULT 0,
  standard_sla_days INTEGER NOT NULL DEFAULT 7,
  urgent_sla_days INTEGER NOT NULL DEFAULT 3,
  pricing_tier pricing_tier NOT NULL DEFAULT 'standard',
  performance_score NUMERIC(3,2) DEFAULT 5.0,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT max_capacity_positive CHECK (max_capacity > 0),
  CONSTRAINT current_load_non_negative CHECK (current_load >= 0),
  CONSTRAINT current_load_within_capacity CHECK (current_load <= max_capacity),
  CONSTRAINT performance_score_range CHECK (performance_score >= 0 AND performance_score <= 10)
);

-- Create lab specializations table (many-to-many: labs ↔ restoration types)
CREATE TABLE public.lab_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  restoration_type restoration_type NOT NULL,
  expertise_level expertise_level NOT NULL DEFAULT 'intermediate',
  turnaround_days INTEGER NOT NULL,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT turnaround_days_positive CHECK (turnaround_days > 0),
  UNIQUE(lab_id, restoration_type)
);

-- Create lab performance metrics table
CREATE TABLE public.lab_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  total_orders INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  average_turnaround_days NUMERIC(5,2),
  approval_rate NUMERIC(5,2),
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT total_orders_non_negative CHECK (total_orders >= 0),
  CONSTRAINT completed_orders_valid CHECK (completed_orders >= 0 AND completed_orders <= total_orders),
  CONSTRAINT on_time_deliveries_valid CHECK (on_time_deliveries >= 0 AND on_time_deliveries <= completed_orders),
  CONSTRAINT approval_rate_valid CHECK (approval_rate IS NULL OR (approval_rate >= 0 AND approval_rate <= 100)),
  UNIQUE(lab_id)
);

-- Create preferred labs table (dentist ↔ lab preferences)
CREATE TABLE public.preferred_labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  priority_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT priority_order_positive CHECK (priority_order > 0),
  UNIQUE(dentist_id, lab_id),
  UNIQUE(dentist_id, priority_order)
);

-- Add lab-related columns to orders table
ALTER TABLE public.orders
ADD COLUMN assigned_lab_id UUID REFERENCES public.labs(id),
ADD COLUMN expected_delivery_date DATE,
ADD COLUMN actual_delivery_date DATE,
ADD COLUMN design_file_url TEXT,
ADD COLUMN design_approved BOOLEAN DEFAULT NULL,
ADD COLUMN approval_notes TEXT;

-- Add lab_id to user_roles to associate staff with labs
ALTER TABLE public.user_roles
ADD COLUMN lab_id UUID REFERENCES public.labs(id);

-- Enable RLS on new tables
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferred_labs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for labs table
CREATE POLICY "Everyone can view active labs"
ON public.labs
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage labs"
ON public.labs
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for lab_specializations
CREATE POLICY "Everyone can view lab specializations"
ON public.lab_specializations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.labs 
    WHERE labs.id = lab_specializations.lab_id 
    AND labs.is_active = true
  )
);

CREATE POLICY "Admins can manage lab specializations"
ON public.lab_specializations
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for lab_performance_metrics
CREATE POLICY "Everyone can view lab performance"
ON public.lab_performance_metrics
FOR SELECT
USING (true);

CREATE POLICY "System can update lab performance"
ON public.lab_performance_metrics
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for preferred_labs
CREATE POLICY "Dentists can view their own preferred labs"
ON public.preferred_labs
FOR SELECT
USING (auth.uid() = dentist_id);

CREATE POLICY "Dentists can manage their own preferred labs"
ON public.preferred_labs
FOR ALL
USING (auth.uid() = dentist_id)
WITH CHECK (auth.uid() = dentist_id);

CREATE POLICY "Admins can view all preferred labs"
ON public.preferred_labs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create trigger to update labs.updated_at
CREATE TRIGGER update_labs_updated_at
  BEFORE UPDATE ON public.labs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function to update lab current_load
CREATE OR REPLACE FUNCTION public.update_lab_current_load()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When order is assigned to a lab, increment load
  IF NEW.assigned_lab_id IS NOT NULL AND (OLD.assigned_lab_id IS NULL OR OLD.assigned_lab_id != NEW.assigned_lab_id) THEN
    -- Decrement old lab if there was one
    IF OLD.assigned_lab_id IS NOT NULL THEN
      UPDATE public.labs
      SET current_load = GREATEST(0, current_load - 1)
      WHERE id = OLD.assigned_lab_id;
    END IF;
    
    -- Increment new lab
    UPDATE public.labs
    SET current_load = current_load + 1
    WHERE id = NEW.assigned_lab_id
    AND current_load < max_capacity;
  END IF;
  
  -- When order is delivered, decrement load
  IF NEW.status = 'Delivered' AND OLD.status != 'Delivered' AND NEW.assigned_lab_id IS NOT NULL THEN
    UPDATE public.labs
    SET current_load = GREATEST(0, current_load - 1)
    WHERE id = NEW.assigned_lab_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for lab load updates
CREATE TRIGGER update_lab_load_on_order_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lab_current_load();

-- Create function to calculate expected delivery date
CREATE OR REPLACE FUNCTION public.calculate_expected_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sla_days INTEGER;
BEGIN
  IF NEW.assigned_lab_id IS NOT NULL AND NEW.expected_delivery_date IS NULL THEN
    -- Get appropriate SLA based on urgency
    SELECT 
      CASE 
        WHEN NEW.urgency = 'Urgent' THEN urgent_sla_days
        ELSE standard_sla_days
      END
    INTO sla_days
    FROM public.labs
    WHERE id = NEW.assigned_lab_id;
    
    -- Set expected delivery date
    NEW.expected_delivery_date := CURRENT_DATE + sla_days;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for expected delivery calculation
CREATE TRIGGER set_expected_delivery_date
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.assigned_lab_id IS NOT NULL)
  EXECUTE FUNCTION public.calculate_expected_delivery();

-- Insert sample labs for testing
INSERT INTO public.labs (name, description, contact_email, contact_phone, max_capacity, standard_sla_days, urgent_sla_days, pricing_tier, performance_score)
VALUES 
  ('Precision Dental Lab', 'Specializing in high-quality crowns and bridges with fast turnaround', 'contact@precisionlab.com', '+1-555-0101', 20, 5, 2, 'premium', 9.2),
  ('SmileTech Lab', 'Expert zirconia restorations and e-max veneers', 'info@smiletechlab.com', '+1-555-0102', 15, 7, 3, 'standard', 8.5),
  ('Affordable Dental Solutions', 'Budget-friendly options with reliable quality', 'support@affordabledentallab.com', '+1-555-0103', 30, 10, 5, 'budget', 7.8);

-- Insert specializations for the sample labs
INSERT INTO public.lab_specializations (lab_id, restoration_type, expertise_level, turnaround_days, is_preferred)
SELECT 
  l.id,
  'Crown'::restoration_type,
  'expert'::expertise_level,
  4,
  true
FROM public.labs l
WHERE l.name = 'Precision Dental Lab';

INSERT INTO public.lab_specializations (lab_id, restoration_type, expertise_level, turnaround_days, is_preferred)
SELECT 
  l.id,
  'Bridge'::restoration_type,
  'expert'::expertise_level,
  5,
  true
FROM public.labs l
WHERE l.name = 'Precision Dental Lab';

INSERT INTO public.lab_specializations (lab_id, restoration_type, expertise_level, turnaround_days, is_preferred)
SELECT 
  l.id,
  'Zirconia'::restoration_type,
  'expert'::expertise_level,
  5,
  true
FROM public.labs l
WHERE l.name = 'SmileTech Lab';

INSERT INTO public.lab_specializations (lab_id, restoration_type, expertise_level, turnaround_days, is_preferred)
SELECT 
  l.id,
  'E-max'::restoration_type,
  'expert'::expertise_level,
  6,
  true
FROM public.labs l
WHERE l.name = 'SmileTech Lab';

INSERT INTO public.lab_specializations (lab_id, restoration_type, expertise_level, turnaround_days, is_preferred)
SELECT 
  l.id,
  'PFM'::restoration_type,
  'intermediate'::expertise_level,
  8,
  false
FROM public.labs l
WHERE l.name = 'Affordable Dental Solutions';

INSERT INTO public.lab_specializations (lab_id, restoration_type, expertise_level, turnaround_days, is_preferred)
SELECT 
  l.id,
  'Acrylic'::restoration_type,
  'intermediate'::expertise_level,
  7,
  false
FROM public.labs l
WHERE l.name = 'Affordable Dental Solutions';

-- Initialize performance metrics for sample labs
INSERT INTO public.lab_performance_metrics (lab_id, total_orders, completed_orders, on_time_deliveries, average_turnaround_days, approval_rate)
SELECT 
  id,
  0,
  0,
  0,
  NULL,
  NULL
FROM public.labs;