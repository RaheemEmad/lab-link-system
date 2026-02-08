-- Add verification tracking columns to labs table
ALTER TABLE labs
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS completed_order_count INTEGER DEFAULT 0;

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS verification_risk_score NUMERIC DEFAULT 0;

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

ALTER TABLE labs
ADD COLUMN IF NOT EXISTS last_risk_check_at TIMESTAMPTZ;

-- Add check constraint for verification_status
DO $$
BEGIN
  ALTER TABLE labs
  ADD CONSTRAINT labs_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'at_risk', 'revoked'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create trigger to auto-verify after 2 completed orders
CREATE OR REPLACE FUNCTION update_lab_verification()
RETURNS TRIGGER AS $$
DECLARE
  v_completed_count INTEGER;
  v_lab_id UUID;
BEGIN
  -- Get the lab_id from the order
  v_lab_id := NEW.assigned_lab_id;
  
  IF v_lab_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only process when order becomes Delivered
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') THEN
    -- Count completed orders
    SELECT COUNT(*) INTO v_completed_count
    FROM orders
    WHERE assigned_lab_id = v_lab_id
    AND status = 'Delivered';
    
    -- Update completed count
    UPDATE labs SET completed_order_count = v_completed_count WHERE id = v_lab_id;
    
    -- Auto-verify if 2+ completed orders
    IF v_completed_count >= 2 THEN
      UPDATE labs 
      SET 
        is_verified = true, 
        verified_at = COALESCE(verified_at, now()),
        verification_status = 'verified'
      WHERE id = v_lab_id AND is_verified = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lab_verification_trigger ON orders;
CREATE TRIGGER lab_verification_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_verification();

-- Create function to check lab verification risk (can be called by cron or admin)
CREATE OR REPLACE FUNCTION check_lab_verification_risk()
RETURNS void AS $$
DECLARE
  lab_record RECORD;
  v_dispute_count INTEGER;
  v_missed_deliveries INTEGER;
  v_recent_rating NUMERIC;
  v_risk_score NUMERIC;
BEGIN
  FOR lab_record IN SELECT id, is_verified FROM labs WHERE is_verified = true LOOP
    -- Count recent disputes (last 90 days)
    SELECT COUNT(*) INTO v_dispute_count
    FROM invoices i
    JOIN orders o ON i.order_id = o.id
    WHERE o.assigned_lab_id = lab_record.id
    AND i.status = 'disputed'
    AND i.created_at > now() - interval '90 days';
    
    -- Count missed deliveries (SLA violations in last 90 days)
    SELECT COUNT(*) INTO v_missed_deliveries
    FROM orders o
    LEFT JOIN order_sla_tracking s ON o.id = s.order_id
    WHERE o.assigned_lab_id = lab_record.id
    AND s.sla_violated = true
    AND o.created_at > now() - interval '90 days';
    
    -- Calculate average recent rating from reviews
    SELECT AVG(rating) INTO v_recent_rating
    FROM lab_reviews
    WHERE lab_id = lab_record.id
    AND created_at > now() - interval '90 days';
    
    -- Calculate risk score (0-100, higher = more risk)
    v_risk_score := 0;
    v_risk_score := v_risk_score + (COALESCE(v_dispute_count, 0) * 15);  -- Each dispute adds 15
    v_risk_score := v_risk_score + (COALESCE(v_missed_deliveries, 0) * 10);  -- Each SLA violation adds 10
    IF v_recent_rating IS NOT NULL AND v_recent_rating < 3.5 THEN
      v_risk_score := v_risk_score + ((3.5 - v_recent_rating) * 20);  -- Low ratings add risk
    END IF;
    
    -- Update lab
    UPDATE labs SET
      verification_risk_score = v_risk_score,
      last_risk_check_at = now(),
      verification_status = CASE
        WHEN v_risk_score >= 50 THEN 'revoked'
        WHEN v_risk_score >= 30 THEN 'at_risk'
        ELSE 'verified'
      END,
      is_verified = (v_risk_score < 50)
    WHERE id = lab_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;