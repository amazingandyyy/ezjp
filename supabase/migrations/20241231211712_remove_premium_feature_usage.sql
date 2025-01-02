-- Drop the premium_feature_usage table since we're using ai_tutor_sessions and tts_sessions instead
DROP TABLE IF EXISTS premium_feature_usage;

-- Create function to count AI tutor usage for a user in the current month
CREATE OR REPLACE FUNCTION get_monthly_ai_tutor_usage(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM ai_tutor_sessions
    WHERE user_id = user_uuid
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
  );
END;
$$;

-- Create function to count TTS usage for a user in the current month
CREATE OR REPLACE FUNCTION get_monthly_tts_usage(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(character_count)::INTEGER, 0)
    FROM tts_sessions
    WHERE user_id = user_uuid
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
  );
END;
$$; 