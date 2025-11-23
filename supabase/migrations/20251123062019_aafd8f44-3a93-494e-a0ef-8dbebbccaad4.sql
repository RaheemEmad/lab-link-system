-- Fix the remaining function security warning
CREATE OR REPLACE FUNCTION check_and_award_badge(
  p_user_id UUID,
  p_badge_id TEXT,
  p_tier TEXT,
  p_required_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  achievement_count INTEGER;
BEGIN
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
$$;