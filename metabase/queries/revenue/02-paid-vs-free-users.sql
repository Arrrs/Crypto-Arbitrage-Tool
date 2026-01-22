-- Query Name: Paid vs Free Users Over Time
-- Description: User base composition by subscription status
-- Visualization: Stacked area chart with percentage line
-- Track conversion funnel and monetization success

SELECT
  date,
  "paidUsers" as paid_users,
  "freeUsers" as free_users,
  "totalUsers" as total_users,
  ROUND(("paidUsers"::numeric / NULLIF("totalUsers", 0)) * 100, 2) as paid_percentage
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY date ASC;
