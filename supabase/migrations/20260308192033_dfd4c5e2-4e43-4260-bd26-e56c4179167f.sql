
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_per_minute integer DEFAULT 10,
  p_max_per_hour integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_minute_ago timestamptz := v_now - interval '1 minute';
  v_hour_ago timestamptz := v_now - interval '1 hour';
  v_minute_count integer := 0;
  v_hour_count integer := 0;
  v_minute_reset timestamptz;
  v_hour_reset timestamptz;
BEGIN
  -- Get minute window count
  SELECT request_count, window_start + interval '1 minute'
  INTO v_minute_count, v_minute_reset
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint || '_minute'
    AND window_start >= v_minute_ago
  LIMIT 1;

  -- Get hour window count
  SELECT request_count, window_start + interval '1 hour'
  INTO v_hour_count, v_hour_reset
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint || '_hour'
    AND window_start >= v_hour_ago
  LIMIT 1;

  -- Check minute limit
  IF COALESCE(v_minute_count, 0) >= p_max_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', format('Rate limit exceeded. Max %s requests per minute.', p_max_per_minute),
      'reset_at', COALESCE(v_minute_reset, v_now + interval '1 minute')
    );
  END IF;

  -- Check hour limit
  IF COALESCE(v_hour_count, 0) >= p_max_per_hour THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', format('Hourly rate limit exceeded. Max %s requests per hour.', p_max_per_hour),
      'reset_at', COALESCE(v_hour_reset, v_now + interval '1 hour')
    );
  END IF;

  -- Upsert minute record
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint || '_minute', 1, v_now)
  ON CONFLICT (identifier, endpoint)
  DO UPDATE SET
    request_count = CASE
      WHEN rate_limits.window_start >= v_minute_ago THEN rate_limits.request_count + 1
      ELSE 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start >= v_minute_ago THEN rate_limits.window_start
      ELSE v_now
    END;

  -- Upsert hour record
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint || '_hour', 1, v_now)
  ON CONFLICT (identifier, endpoint)
  DO UPDATE SET
    request_count = CASE
      WHEN rate_limits.window_start >= v_hour_ago THEN rate_limits.request_count + 1
      ELSE 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start >= v_hour_ago THEN rate_limits.window_start
      ELSE v_now
    END;

  RETURN jsonb_build_object(
    'allowed', true,
    'minute_remaining', p_max_per_minute - COALESCE(v_minute_count, 0) - 1,
    'hour_remaining', p_max_per_hour - COALESCE(v_hour_count, 0) - 1
  );
END;
$$;
