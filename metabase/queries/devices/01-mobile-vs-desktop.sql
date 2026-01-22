-- Query Name: Mobile vs Desktop vs Tablet Usage
-- Description: User distribution across device types
-- Visualization: 100% stacked area chart
-- Colors: mobile (blue), desktop (green), tablet (orange)

SELECT
  date,
  "mobileUsers" as mobile,
  "desktopUsers" as desktop,
  "tabletUsers" as tablet,
  "activeUsers" as total_active,
  ROUND(("mobileUsers"::numeric / NULLIF("activeUsers", 0)) * 100, 2) as mobile_pct
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
