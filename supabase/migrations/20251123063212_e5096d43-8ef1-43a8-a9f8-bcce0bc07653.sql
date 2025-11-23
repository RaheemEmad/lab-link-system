-- Create challenges table
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'monthly')),
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id, expires_at)
);

-- Enable RLS
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own challenges"
  ON public.user_challenges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON public.user_challenges
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert challenges"
  ON public.user_challenges
  FOR INSERT
  WITH CHECK (true);

-- More Lab achievements

-- Team Player: Collaborate on 10 orders
CREATE OR REPLACE FUNCTION award_team_player_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT COUNT(DISTINCT order_id)
    FROM order_assignments
    WHERE user_id = NEW.user_id
  ) >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.user_id, 'team_player')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_team_player
  AFTER INSERT ON order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION award_team_player_achievement();

-- Speed Demon: Complete 5 orders in one day
CREATE OR REPLACE FUNCTION award_speed_demon_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Delivered' AND OLD.status != 'Delivered' THEN
    IF (
      SELECT COUNT(*)
      FROM orders o
      JOIN order_assignments oa ON oa.order_id = o.id
      WHERE oa.user_id = (
        SELECT user_id FROM order_assignments WHERE order_id = NEW.id LIMIT 1
      )
      AND o.status = 'Delivered'
      AND o.actual_delivery_date::date = CURRENT_DATE
    ) >= 5 THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      SELECT user_id, 'speed_demon'
      FROM order_assignments
      WHERE order_id = NEW.id
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_speed_demon
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'Delivered' AND OLD.status IS DISTINCT FROM 'Delivered')
  EXECUTE FUNCTION award_speed_demon_achievement();

-- Quality Guardian: Complete 25 QC checks
CREATE OR REPLACE FUNCTION award_quality_guardian_achievement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    IF (
      SELECT COUNT(*)
      FROM qc_checklist_items
      WHERE completed_by = NEW.completed_by
      AND is_completed = true
    ) >= 25 THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (NEW.completed_by, 'quality_guardian')
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_quality_guardian
  AFTER UPDATE ON qc_checklist_items
  FOR EACH ROW
  WHEN (NEW.is_completed = true AND OLD.is_completed = false)
  EXECUTE FUNCTION award_quality_guardian_achievement();

-- Communication Pro: Add 15 notes
CREATE OR REPLACE FUNCTION award_communication_pro_achievement()
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
  ) >= 15 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.user_id, 'communication_pro')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_communication_pro
  AFTER INSERT ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION award_communication_pro_achievement();

-- Archive Master: Upload 50 files
CREATE OR REPLACE FUNCTION award_archive_master_achievement()
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
  ) >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (NEW.uploaded_by, 'archive_master')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_archive_master
  AFTER INSERT ON order_attachments
  FOR EACH ROW
  EXECUTE FUNCTION award_archive_master_achievement();

-- Function to create daily challenges
CREATE OR REPLACE FUNCTION create_daily_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  challenge_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  challenge_expiry := (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone;
  
  -- Doctor daily challenges
  FOR user_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'doctor'
  LOOP
    -- Daily: Submit 3 orders
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'daily_submit_orders', 'daily', 0, 3, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
    
    -- Daily: Add 2 notes
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'daily_add_notes', 'daily', 0, 2, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
  END LOOP;
  
  -- Lab daily challenges
  FOR user_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'lab_staff'
  LOOP
    -- Daily: Process 5 orders
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'daily_process_orders', 'daily', 0, 5, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
    
    -- Daily: Complete 3 QC checks
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'daily_qc_checks', 'daily', 0, 3, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
  END LOOP;
END;
$$;

-- Function to create weekly challenges
CREATE OR REPLACE FUNCTION create_weekly_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  challenge_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  challenge_expiry := (CURRENT_DATE + INTERVAL '7 days')::timestamp with time zone;
  
  -- Doctor weekly challenges
  FOR user_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'doctor'
  LOOP
    -- Weekly: Complete 10 orders
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'weekly_complete_orders', 'weekly', 0, 10, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
    
    -- Weekly: Approve 5 designs within 24h
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'weekly_fast_approvals', 'weekly', 0, 5, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
  END LOOP;
  
  -- Lab weekly challenges
  FOR user_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'lab_staff'
  LOOP
    -- Weekly: Process 25 orders
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'weekly_process_orders', 'weekly', 0, 25, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
    
    -- Weekly: Upload 10 files
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'weekly_upload_files', 'weekly', 0, 10, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
  END LOOP;
END;
$$;

-- Function to create monthly challenges
CREATE OR REPLACE FUNCTION create_monthly_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  challenge_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  challenge_expiry := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamp with time zone;
  
  -- Doctor monthly challenges
  FOR user_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'doctor'
  LOOP
    -- Monthly: Complete 50 orders
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'monthly_complete_orders', 'monthly', 0, 50, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
    
    -- Monthly: Maintain 90% on-time rate
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'monthly_ontime_rate', 'monthly', 0, 90, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
  END LOOP;
  
  -- Lab monthly challenges
  FOR user_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'lab_staff'
  LOOP
    -- Monthly: Process 100 orders
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'monthly_process_orders', 'monthly', 0, 100, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
    
    -- Monthly: Complete 50 QC checks
    INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, target, expires_at)
    VALUES (user_record.user_id, 'monthly_qc_checks', 'monthly', 0, 50, challenge_expiry)
    ON CONFLICT (user_id, challenge_id, expires_at) DO NOTHING;
  END LOOP;
END;
$$;

-- Update challenge progress on order creation (doctors)
CREATE OR REPLACE FUNCTION update_doctor_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update daily submit challenge
  UPDATE user_challenges
  SET progress = progress + 1,
      completed = CASE WHEN progress + 1 >= target THEN true ELSE false END,
      completed_at = CASE WHEN progress + 1 >= target THEN now() ELSE NULL END
  WHERE user_id = NEW.doctor_id
  AND challenge_id = 'daily_submit_orders'
  AND expires_at > now()
  AND NOT completed;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_doctor_challenge_progress
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.doctor_id IS NOT NULL)
  EXECUTE FUNCTION update_doctor_challenge_progress();

-- Update challenge progress on order completion
CREATE OR REPLACE FUNCTION update_completion_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Delivered' AND OLD.status != 'Delivered' THEN
    -- Update weekly/monthly doctor challenges
    UPDATE user_challenges
    SET progress = progress + 1,
        completed = CASE WHEN progress + 1 >= target THEN true ELSE false END,
        completed_at = CASE WHEN progress + 1 >= target THEN now() ELSE NULL END
    WHERE user_id = NEW.doctor_id
    AND challenge_id IN ('weekly_complete_orders', 'monthly_complete_orders')
    AND expires_at > now()
    AND NOT completed;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_completion_challenge_progress
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'Delivered' AND OLD.status IS DISTINCT FROM 'Delivered')
  EXECUTE FUNCTION update_completion_challenge_progress();