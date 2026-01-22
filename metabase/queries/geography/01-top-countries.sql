-- Query Name: Top Countries by Active Users
-- Description: Countries with most active users
-- Visualization: Map (if supported) or horizontal bar chart
-- Localization priorities and timezone considerations

SELECT
  country,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT "userId") as unique_users,
  COUNT(DISTINCT DATE(timestamp)) as days_active
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '30 days'
  AND country IS NOT NULL
GROUP BY country
ORDER BY unique_users DESC
LIMIT 20;
