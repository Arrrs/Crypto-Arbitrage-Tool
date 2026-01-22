-- Query Name: Weekly & Monthly Active Users (WAU/MAU)
-- Description: Rolling 7-day and 30-day active user counts
-- Visualization: Line chart (multi-line)
-- Shows: DAU, WAU, MAU in different colors

WITH daily_active AS (
  SELECT
    date,
    "activeUsers" as dau
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '60 days'
)
SELECT
  date,
  dau,
  SUM(dau) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as wau,
  SUM(dau) OVER (
    ORDER BY date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) as mau
FROM daily_active
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
