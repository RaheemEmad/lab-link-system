-- Create badges table for tracking badge tier unlocks
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own badges"
  ON public.user_badges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can earn badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Lab staff achievements

-- Data Dynamo: Process 10 test results in one day
CREATE OR REPLACE FUNCTION award_data_dynamo_achievement()
RETURNS TRIGGER AS $$
BEGIN
  -- Count orders updated by this lab staff today
  IF (
    SELECT COUNT(*)
    FROM orders
    WHERE status_updated_at::date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM order_assignments
      WHERE order_assignments.order_id = orders.id
      AND order_assignments.user_id = NEW.changed_by
    )
  ) >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.changed_by, 'data_dynamo')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_data_dynamo
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION award_data_dynamo_achievement();

-- Precision Pointer: Complete 5 quality checks
CREATE OR REPLACE FUNCTION award_precision_pointer_achievement()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM qc_checklist_items
    WHERE completed_by = NEW.completed_by
    AND is_completed = true
  ) >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.completed_by, 'precision_pointer')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_precision_pointer
  AFTER UPDATE ON qc_checklist_items
  FOR EACH ROW
  WHEN (NEW.is_completed = true AND OLD.is_completed = false)
  EXECUTE FUNCTION award_precision_pointer_achievement();

-- Rush Hour Hero: Process STAT within 1 hour
CREATE OR REPLACE FUNCTION award_rush_hour_hero_achievement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.urgency = 'Urgent' AND 
     NEW.status = 'In Progress' AND
     (NEW.status_updated_at - NEW.created_at) <= INTERVAL '1 hour' THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.changed_by, 'rush_hour_hero')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_rush_hour_hero
  AFTER INSERT ON order_status_history
  FOR EACH ROW
  WHEN (NEW.new_status = 'In Progress')
  EXECUTE FUNCTION award_rush_hour_hero_achievement();

-- Paperless Pro: Upload 25 digital records
CREATE OR REPLACE FUNCTION award_paperless_pro_achievement()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM order_attachments
    WHERE uploaded_by = NEW.uploaded_by
  ) >= 25 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.uploaded_by, 'paperless_pro')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_paperless_pro
  AFTER INSERT ON order_attachments
  FOR EACH ROW
  EXECUTE FUNCTION award_paperless_pro_achievement();

-- Feature Finder: Use advanced reporting 5 times (tracked via metadata)
-- This would be tracked when users use filtering features

-- Doctor achievements (additional to existing ones)

-- The Consult: Review 15 patient results
CREATE OR REPLACE FUNCTION award_the_consult_achievement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Delivered' AND NEW.doctor_id IS NOT NULL THEN
    IF (
      SELECT COUNT(*)
      FROM orders
      WHERE doctor_id = NEW.doctor_id
      AND status = 'Delivered'
    ) >= 15 THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (NEW.doctor_id, 'the_consult')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_the_consult
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'Delivered' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION award_the_consult_achievement();

-- Feedback Flow: Send 5 notes to lab
CREATE OR REPLACE FUNCTION award_feedback_flow_achievement()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM order_notes
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.user_id, 'feedback_flow')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_feedback_flow
  AFTER INSERT ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION award_feedback_flow_achievement();

-- Rapid Reviewer: Review STAT within 30 minutes
CREATE OR REPLACE FUNCTION award_rapid_reviewer_achievement()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
BEGIN
  SELECT * INTO order_record FROM orders WHERE id = NEW.order_id;
  
  IF order_record.urgency = 'Urgent' AND 
     order_record.status = 'Delivered' AND
     order_record.design_approved = true AND
     (NEW.created_at - order_record.status_updated_at) <= INTERVAL '30 minutes' THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.user_id, 'rapid_reviewer')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_rapid_reviewer
  AFTER INSERT ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION award_rapid_reviewer_achievement();

-- Badge tier awarding function
CREATE OR REPLACE FUNCTION check_and_award_badge(
  p_user_id UUID,
  p_badge_id TEXT,
  p_tier TEXT,
  p_required_count INTEGER
)
RETURNS VOID AS $$
DECLARE
  achievement_count INTEGER;
BEGIN
  -- Count achievements for this badge category
  SELECT COUNT(*) INTO achievement_count
  FROM user_achievements
  WHERE user_id = p_user_id
  AND achievement_id LIKE p_badge_id || '%';
  
  IF achievement_count >= p_required_count THEN
    INSERT INTO user_badges (user_id, badge_id, tier)
    VALUES (p_user_id, p_badge_id, p_tier)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;