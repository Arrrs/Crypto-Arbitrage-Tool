-- Query Name: Total Users Over Time
-- Description: Cumulative user count growth
-- Visualization: Area chart
-- Color: Growth-positive color (blue/green)

SELECT
  date,
  "totalUsers" as total_users
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '180 days'
ORDER BY date ASC;
