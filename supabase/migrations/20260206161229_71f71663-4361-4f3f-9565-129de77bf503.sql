-- Add pricing_mode and pricing_configured_at to labs table
ALTER TABLE labs 
ADD COLUMN IF NOT EXISTS pricing_mode TEXT CHECK (pricing_mode IN ('TEMPLATE', 'CUSTOM')) DEFAULT NULL;

ALTER TABLE labs 
ADD COLUMN IF NOT EXISTS pricing_configured_at TIMESTAMPTZ DEFAULT NULL;

-- Add versioning columns to lab_pricing table  
ALTER TABLE lab_pricing
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE lab_pricing  
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT now();

ALTER TABLE lab_pricing
ADD COLUMN IF NOT EXISTS effective_until TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE lab_pricing
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

-- Create pricing audit/history table for tracking changes
CREATE TABLE IF NOT EXISTS lab_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID REFERENCES labs(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pricing_mode TEXT,
  pricing_data JSONB NOT NULL,
  version INTEGER NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  change_reason TEXT
);

-- Enable RLS on pricing history
ALTER TABLE lab_pricing_history ENABLE ROW LEVEL SECURITY;

-- Lab staff can view their lab's pricing history
CREATE POLICY "Lab staff can view their pricing history" 
ON lab_pricing_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_pricing_history.lab_id 
    AND user_roles.role = 'lab_staff'
  )
);

-- System can insert pricing history
CREATE POLICY "System can insert pricing history" 
ON lab_pricing_history 
FOR INSERT 
WITH CHECK (true);

-- Admins can view all pricing history
CREATE POLICY "Admins can view all pricing history" 
ON lab_pricing_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Create function to validate lab pricing before order creation
CREATE OR REPLACE FUNCTION validate_lab_pricing_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation for orders without assigned lab (marketplace orders)
  IF NEW.assigned_lab_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if the assigned lab has pricing configured
  IF NOT EXISTS (
    SELECT 1 FROM labs 
    WHERE id = NEW.assigned_lab_id 
    AND pricing_mode IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot assign order to lab without configured pricing';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate pricing on order assignment
DROP TRIGGER IF EXISTS validate_lab_pricing_trigger ON orders;
CREATE TRIGGER validate_lab_pricing_trigger
  BEFORE INSERT OR UPDATE OF assigned_lab_id ON orders
  FOR EACH ROW
  WHEN (NEW.assigned_lab_id IS NOT NULL)
  EXECUTE FUNCTION validate_lab_pricing_on_order();

-- Update RLS policy for lab_pricing to allow labs to manage their own pricing
DROP POLICY IF EXISTS "Lab staff can manage their pricing" ON lab_pricing;
CREATE POLICY "Lab staff can manage their pricing" 
ON lab_pricing 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_pricing.lab_id 
    AND user_roles.role = 'lab_staff'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_pricing.lab_id 
    AND user_roles.role = 'lab_staff'
  )
);

-- Create view-only policy for authenticated users to see lab pricing
DROP POLICY IF EXISTS "Authenticated users can view lab pricing" ON lab_pricing;
CREATE POLICY "Authenticated users can view lab pricing" 
ON lab_pricing 
FOR SELECT 
USING (true);

-- Admins can manage all pricing
DROP POLICY IF EXISTS "Admins can manage all pricing" ON lab_pricing;
CREATE POLICY "Admins can manage all pricing" 
ON lab_pricing 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));