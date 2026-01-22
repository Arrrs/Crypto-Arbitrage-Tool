-- Query Name: Current Hour Activity
-- Description: Activity in the current hour so far
-- Visualization: Single value metrics (dashboard cards)
-- Auto-refresh: Every 1 minute

SELECT
  DATE_TRUNC('hour', NOW()) as current_hour,
  COUNT(*) as events_this_hour,
  COUNT(DISTINCT "userId") as unique_users_this_hour,
  COUNT(CASE WHEN activity = 'PAGE_VIEW' THEN 1 END) as page_views,
  COUNT(CASE WHEN activity = 'FEATURE_USE' THEN 1 END) as feature_uses
FROM user_activity_logs
WHERE timestamp >= DATE_TRUNC('hour', NOW());
