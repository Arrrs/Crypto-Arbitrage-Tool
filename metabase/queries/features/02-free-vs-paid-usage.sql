-- Query Name: Free vs Paid Feature Usage
-- Description: How free and paid users use features differently
-- Visualization: Grouped bar chart
-- Identify features to paywall and upgrade drivers

SELECT
  "featureName",
  SUM("freeUserUses") as free_uses,
  SUM("paidUserUses") as paid_uses,
  SUM("freeUserUses") + SUM("paidUserUses") as total_uses,
  ROUND(
    (SUM("paidUserUses")::numeric /
    NULLIF(SUM("freeUserUses") + SUM("paidUserUses"), 0)) * 100,
    2
  ) as paid_usage_pct
FROM feature_usage_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY "featureName"
ORDER BY total_uses DESC
LIMIT 20;
