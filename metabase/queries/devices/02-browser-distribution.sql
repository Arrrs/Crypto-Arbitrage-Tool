-- Query Name: Browser Distribution
-- Description: Which browsers your users use
-- Visualization: Pie chart or donut chart
-- Show percentages on slices

SELECT
  browser,
  COUNT(*) as sessions,
  COUNT(DISTINCT "userId") as unique_users,
  ROUND(AVG(duration) / 1000.0, 2) as avg_session_duration_sec
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '30 days'
  AND browser IS NOT NULL
GROUP BY browser
ORDER BY sessions DESC;
