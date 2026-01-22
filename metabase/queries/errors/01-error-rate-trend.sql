-- Query Name: Error Rate Trend
-- Description: Application error rate over time
-- Visualization: Line chart with shaded threshold
-- Shade red above 1% threshold, secondary bars for absolute count

SELECT
  hour,
  "pageViews",
  errors,
  "errorRate" as error_rate_pct,
  "apiCalls"
FROM hourly_activity_stats
WHERE hour >= NOW() - INTERVAL '7 days'
ORDER BY hour ASC;
