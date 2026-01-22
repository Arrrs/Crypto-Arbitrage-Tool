-- Query Name: Most Used Features (Last 30 Days)
-- Description: Top features by total usage count
-- Visualization: Horizontal bar chart
-- Prioritize development on popular features

SELECT
  "featureName",
  SUM("totalUses") as total_uses,
  SUM("uniqueUsers") as unique_users,
  ROUND(
    SUM("totalUses")::numeric / NULLIF(SUM("uniqueUsers"), 0),
    2
  ) as uses_per_user
FROM feature_usage_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY "featureName"
ORDER BY total_uses DESC
LIMIT 20;
