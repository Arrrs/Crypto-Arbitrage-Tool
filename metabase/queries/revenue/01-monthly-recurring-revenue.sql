-- Query Name: Monthly Recurring Revenue (MRR)
-- Description: Total revenue per month
-- Visualization: Bar chart with trend line
-- Key SaaS metric for business health

SELECT
  DATE_TRUNC('month', date) as month,
  SUM(revenue) as total_revenue,
  COUNT(DISTINCT date) as days_in_period,
  ROUND(AVG(revenue), 2) as avg_daily_revenue
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month ASC;
