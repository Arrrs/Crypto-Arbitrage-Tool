-- Query Name: Active Users Right Now
-- Description: Users active in last 5 minutes
-- Visualization: Single value metric (large number)
-- Auto-refresh: Every 30 seconds
-- Color: Green if > threshold

SELECT
  COUNT(DISTINCT "userId") as active_users_last_5min,
  COUNT(*) as total_events_last_5min,
  COUNT(DISTINCT country) as countries_active
FROM user_activity_logs
WHERE timestamp >= NOW() - INTERVAL '5 minutes';
