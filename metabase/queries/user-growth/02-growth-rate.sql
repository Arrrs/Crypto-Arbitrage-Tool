-- Query Name: User Growth Rate (%)
-- Description: Daily/weekly/monthly growth rate percentage
-- Visualization: Line chart (multi-line)
-- Shows: daily_growth_pct, weekly_growth_pct, monthly_growth_pct

WITH growth AS (
  SELECT
    date,
    "totalUsers",
    LAG("totalUsers", 1) OVER (ORDER BY date) as prev_day_users,
    LAG("totalUsers", 7) OVER (ORDER BY date) as prev_week_users,
    LAG("totalUsers", 30) OVER (ORDER BY date) as prev_month_users
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
  date,
  ROUND(
    ("totalUsers" - prev_day_users)::numeric / NULLIF(prev_day_users, 0) * 100,
    2
  ) as daily_growth_pct,
  ROUND(
    ("totalUsers" - prev_week_users)::numeric / NULLIF(prev_week_users, 0) * 100,
    2
  ) as weekly_growth_pct,
  ROUND(
    ("totalUsers" - prev_month_users)::numeric / NULLIF(prev_month_users, 0) * 100,
    2
  ) as monthly_growth_pct
FROM growth
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
