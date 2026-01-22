-- Query Name: Daily Active Users (DAU)
-- Description: Number of users who logged in each day
-- Visualization: Line chart with dual axis
-- Left axis: dau, Right axis: avg_sessions_per_user

SELECT
  date,
  "activeUsers" as dau,
  "totalLogins" as total_logins,
  ROUND("totalLogins"::numeric / NULLIF("activeUsers", 0), 2) as avg_sessions_per_user
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
