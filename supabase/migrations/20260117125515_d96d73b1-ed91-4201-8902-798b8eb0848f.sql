-- =============================================
-- PHASE 1: Lab-Locked Pricing Model
-- =============================================

-- Add price snapshot columns to lab_work_requests
ALTER TABLE lab_work_requests 
ADD COLUMN IF NOT EXISTS price_snapshot NUMERIC,
ADD COLUMN IF NOT EXISTS price_snapshot_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_days_snapshot INTEGER,
ADD COLUMN IF NOT EXISTS includes_rush_snapshot BOOLEAN,
ADD COLUMN IF NOT EXISTS rush_surcharge_snapshot INTEGER;

-- Function to capture price at application time
CREATE OR REPLACE FUNCTION capture_price_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  pricing RECORD;
  order_record RECORD;
  lab_record RECORD;
BEGIN
  -- Get order details for restoration type
  SELECT restoration_type, urgency INTO order_record
  FROM orders WHERE id = NEW.order_id;
  
  -- Get lab details for SLA
  SELECT standard_sla_days, urgent_sla_days, min_price_egp, max_price_egp INTO lab_record
  FROM labs WHERE id = NEW.lab_id;
  
  -- Get lab pricing for this restoration type
  SELECT * INTO pricing FROM lab_pricing 
  WHERE lab_id = NEW.lab_id 
  AND restoration_type = order_record.restoration_type::text;
  
  IF FOUND THEN
    NEW.price_snapshot := COALESCE(pricing.fixed_price, pricing.min_price, lab_record.min_price_egp);
    NEW.includes_rush_snapshot := pricing.includes_rush;
    NEW.rush_surcharge_snapshot := pricing.rush_surcharge_percent;
  ELSE
    -- Fallback to lab's general pricing
    NEW.price_snapshot := lab_record.min_price_egp;
    NEW.includes_rush_snapshot := false;
    NEW.rush_surcharge_snapshot := 0;
  END IF;
  
  NEW.price_snapshot_at := NOW();
  
  -- Set SLA based on urgency
  IF order_record.urgency = 'Urgent' THEN
    NEW.sla_days_snapshot := lab_record.urgent_sla_days;
  ELSE
    NEW.sla_days_snapshot := lab_record.standard_sla_days;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for price snapshot on request
DROP TRIGGER IF EXISTS capture_price_on_request ON lab_work_requests;
CREATE TRIGGER capture_price_on_request
BEFORE INSERT ON lab_work_requests
FOR EACH ROW EXECUTE FUNCTION capture_price_snapshot();

-- Function to lock price on acceptance and update order
CREATE OR REPLACE FUNCTION lock_price_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Update order with locked price and expected delivery date
    UPDATE orders SET 
      price = COALESCE(NEW.bid_amount, NEW.price_snapshot),
      expected_delivery_date = CURRENT_DATE + NEW.sla_days_snapshot,
      updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for price lock on acceptance
DROP TRIGGER IF EXISTS lock_price_on_acceptance ON lab_work_requests;
CREATE TRIGGER lock_price_on_acceptance
AFTER UPDATE ON lab_work_requests
FOR EACH ROW EXECUTE FUNCTION lock_price_on_acceptance();

-- =============================================
-- PHASE 2: Notification Reminders System
-- =============================================

-- Create notification reminders configuration table
CREATE TABLE IF NOT EXISTS notification_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL, -- 'lab_application_pending', 'sla_warning', 'feedback_pending'
  hours_after_event INTEGER NOT NULL,
  escalation_level INTEGER DEFAULT 1,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default reminder configurations
INSERT INTO notification_reminders (trigger_type, hours_after_event, escalation_level, message_template) VALUES
('lab_application_pending', 24, 1, 'You have pending lab applications waiting for review'),
('lab_application_pending', 48, 2, 'URGENT: Lab applications need your attention'),
('sla_warning', 24, 1, 'Order #{order_number} is due in 24 hours'),
('sla_warning', 6, 2, 'URGENT: Order #{order_number} is due in 6 hours'),
('feedback_pending', 48, 1, 'Feedback room has items awaiting your approval'),
('delivery_pending', 24, 1, 'Please confirm delivery for Order #{order_number}'),
('delivery_pending', 72, 2, 'URGENT: Delivery confirmation pending for 3+ days')
ON CONFLICT DO NOTHING;

-- Create sent reminders tracking table
CREATE TABLE IF NOT EXISTS sent_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_id UUID REFERENCES notification_reminders(id),
  order_id UUID REFERENCES orders(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reminder_id, order_id)
);

-- Enable RLS on new tables
ALTER TABLE notification_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_reminders (read-only for all authenticated users)
CREATE POLICY "Anyone can read notification reminders"
ON notification_reminders FOR SELECT
USING (true);

-- RLS Policies for sent_reminders
CREATE POLICY "Users can view their own sent reminders"
ON sent_reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert sent reminders"
ON sent_reminders FOR INSERT
WITH CHECK (true);

-- =============================================
-- PHASE 3: Enhanced Delivery Acceptance
-- =============================================

-- Add delivery acceptance status column if not exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_acceptance_status TEXT 
DEFAULT 'pending'
CHECK (delivery_acceptance_status IN ('pending', 'accepted', 'disputed'));

-- Trigger to log delivery acceptance event
CREATE OR REPLACE FUNCTION log_delivery_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_confirmed_at IS NOT NULL AND OLD.delivery_confirmed_at IS NULL THEN
    -- Update acceptance status
    NEW.delivery_acceptance_status := 'accepted';
    
    -- Log status change in history
    INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
    VALUES (NEW.id, 'Ready for Delivery', 'Delivered', NEW.delivery_confirmed_by, 'Doctor confirmed delivery receipt');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for delivery acceptance logging
DROP TRIGGER IF EXISTS log_delivery_acceptance ON orders;
CREATE TRIGGER log_delivery_acceptance
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION log_delivery_acceptance();