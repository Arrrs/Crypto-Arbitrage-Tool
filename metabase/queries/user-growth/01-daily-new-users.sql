-- Query Name: Daily New Users Trend
-- Description: Number of new signups per day over the last 30 days
-- Visualization: Line chart (dual-axis)
-- X-axis: date
-- Y-axis (left): new_users
-- Y-axis (right): cumulative_total

SELECT
  date,
  "newUsers" as new_users,
  "totalUsers" as cumulative_total
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
