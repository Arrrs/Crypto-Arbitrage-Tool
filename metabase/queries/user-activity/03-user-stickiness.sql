-- Query Name: User Stickiness (DAU/MAU Ratio)
-- Description: How often active users return (engagement quality)
-- Visualization: Line chart with goal line at 20%
-- Good for SaaS: 20%+ is considered healthy

WITH metrics AS (
  SELECT
    date,
    "activeUsers" as dau,
    SUM("activeUsers") OVER (
      ORDER BY date
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) as mau
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '60 days'
)
SELECT
  date,
  dau,
  mau,
  ROUND((dau::numeric / NULLIF(mau, 0)) * 100, 2) as stickiness_pct
FROM metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
