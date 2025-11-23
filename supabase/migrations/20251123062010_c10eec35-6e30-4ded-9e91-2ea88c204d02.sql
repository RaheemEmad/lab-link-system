-- Fix security warnings: Set search_path for all functions

CREATE OR REPLACE FUNCTION award_data_dynamo_achievement()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION award_precision_pointer_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION award_rush_hour_hero_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION award_paperless_pro_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION award_the_consult_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION award_feedback_flow_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION award_rapid_reviewer_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;