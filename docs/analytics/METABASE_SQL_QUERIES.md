# Metabase SQL Queries for Analytics

**Complete SQL Query Reference for Analytics Dashboards**

This document contains production-ready SQL queries organized by dashboard type. Each query includes:
- Short descriptive name
- What it shows and why it's useful
- Complete SQL query
- Recommended visualization type
- Metabase setup instructions

---

## Table of Contents

1. [User Growth Dashboard](#user-growth-dashboard)
2. [User Activity Dashboard](#user-activity-dashboard)
3. [Revenue & Subscriptions Dashboard](#revenue--subscriptions-dashboard)
4. [Feature Adoption Dashboard](#feature-adoption-dashboard)
5. [Device & Platform Dashboard](#device--platform-dashboard)
6. [Geographic Analytics Dashboard](#geographic-analytics-dashboard)
7. [Performance & Errors Dashboard](#performance--errors-dashboard)
8. [Real-Time Monitoring Dashboard](#real-time-monitoring-dashboard)
9. [User Retention Dashboard](#user-retention-dashboard)
10. [Advanced Analytics](#advanced-analytics)

---

## User Growth Dashboard

Track user acquisition, growth trends, and user base composition.

### 1. Daily New Users Trend

**What it shows**: Number of new signups per day over the last 30 days

**Why it's useful**: Identify growth patterns, marketing campaign impact, seasonality

**SQL Query**:
```sql
SELECT
  date,
  "newUsers" as new_users,
  "totalUsers" as cumulative_total
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**Visualization**: Line chart (dual-axis)
- X-axis: date
- Y-axis (left): new_users
- Y-axis (right): cumulative_total

**Metabase Setup**:
1. Create new question → Native query (SQL)
2. Paste query above
3. Visualization → Line chart
4. Settings → Add series (cumulative_total) on right axis
5. Format → Date format: "MMM DD"

---

### 2. User Growth Rate (%)

**What it shows**: Daily/weekly/monthly growth rate percentage

**Why it's useful**: Measure acceleration of growth, compare time periods

**SQL Query**:
```sql
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
```

**Visualization**: Line chart (multi-line)

**Metabase Setup**:
1. Native query → Paste SQL
2. Visualization → Line chart
3. Add all three growth metrics as separate lines
4. Y-axis label: "Growth Rate (%)"

---

### 3. Total Users Over Time

**What it shows**: Cumulative user count growth

**Why it's useful**: Big picture view of total user base growth

**SQL Query**:
```sql
SELECT
  date,
  "totalUsers" as total_users
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '180 days'
ORDER BY date ASC;
```

**Visualization**: Area chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Visualization → Area chart
3. Color: Growth-positive color (blue/green)

---

### 4. Weekly Signup Summary

**What it shows**: Signups grouped by week with comparison to previous week

**Why it's useful**: Identify weekly trends, plan weekly reviews

**SQL Query**:
```sql
WITH weekly_stats AS (
  SELECT
    DATE_TRUNC('week', date) as week_start,
    SUM("newUsers") as new_users_this_week,
    LAG(SUM("newUsers"), 1) OVER (ORDER BY DATE_TRUNC('week', date)) as new_users_prev_week
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY DATE_TRUNC('week', date)
)
SELECT
  week_start,
  new_users_this_week,
  new_users_prev_week,
  ROUND(
    (new_users_this_week - new_users_prev_week)::numeric /
    NULLIF(new_users_prev_week, 0) * 100,
    1
  ) as week_over_week_change_pct
FROM weekly_stats
ORDER BY week_start DESC
LIMIT 12;
```

**Visualization**: Table with conditional formatting

**Metabase Setup**:
1. Native query → Paste SQL
2. Visualization → Table
3. Conditional formatting: Green if positive change, red if negative

---

### 5. Monthly User Acquisition

**What it shows**: Total new users per month

**Why it's useful**: Monthly reporting, board presentations

**SQL Query**:
```sql
SELECT
  DATE_TRUNC('month', date) as month,
  SUM("newUsers") as new_users,
  AVG("newUsers")::int as avg_daily_signups
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month ASC;
```

**Visualization**: Bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Visualization → Bar chart
3. X-axis format: "MMM YYYY"

---

## User Activity Dashboard

Track daily active users, engagement patterns, and login metrics.

### 6. Daily Active Users (DAU)

**What it shows**: Number of users who logged in each day

**Why it's useful**: Core engagement metric, identify drop-offs

**SQL Query**:
```sql
SELECT
  date,
  "activeUsers" as dau,
  "totalLogins" as total_logins,
  ROUND("totalLogins"::numeric / NULLIF("activeUsers", 0), 2) as avg_sessions_per_user
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**Visualization**: Line chart with dual axis

**Metabase Setup**:
1. Native query → Paste SQL
2. Line chart with DAU on left axis, avg_sessions_per_user on right axis

---

### 7. Weekly Active Users (WAU) & Monthly Active Users (MAU)

**What it shows**: Rolling 7-day and 30-day active user counts

**Why it's useful**: Understand sustained engagement vs one-time usage

**SQL Query**:
```sql
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
```

**Visualization**: Line chart (multi-line)

**Metabase Setup**:
1. Native query → Paste SQL
2. Three lines: DAU, WAU, MAU in different colors

---

### 8. User Stickiness (DAU/MAU Ratio)

**What it shows**: How often active users return (engagement quality)

**Why it's useful**: Industry benchmark metric (20%+ is good for SaaS)

**SQL Query**:
```sql
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
```

**Visualization**: Line chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Primary metric: stickiness_pct
3. Add goal line at 20% for reference

---

### 9. Login Success vs Failures

**What it shows**: Login attempts, success rate, failed login trends

**Why it's useful**: Identify authentication issues, potential security threats

**SQL Query**:
```sql
SELECT
  date,
  "totalLogins" as successful_logins,
  "failedLogins" as failed_logins,
  "totalLogins" + "failedLogins" as total_attempts,
  ROUND(
    ("totalLogins"::numeric / NULLIF("totalLogins" + "failedLogins", 0)) * 100,
    2
  ) as success_rate_pct
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**Visualization**: Stacked bar chart with success rate line

**Metabase Setup**:
1. Native query → Paste SQL
2. Stacked bars for successful/failed logins
3. Overlay line for success_rate_pct

---

### 10. Page Views Trend

**What it shows**: Total page views per day

**Why it's useful**: Overall engagement and traffic monitoring

**SQL Query**:
```sql
SELECT
  date,
  "totalPageViews" as page_views,
  "activeUsers" as active_users,
  ROUND("totalPageViews"::numeric / NULLIF("activeUsers", 0), 2) as pages_per_user
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**Visualization**: Line chart with dual axis

**Metabase Setup**:
1. Native query → Paste SQL
2. Left axis: page_views, Right axis: pages_per_user

---

### 11. Hourly Activity Pattern (Last 24 Hours)

**What it shows**: Activity by hour to identify peak usage times

**Why it's useful**: Schedule maintenance, plan capacity, optimize email send times

**SQL Query**:
```sql
SELECT
  hour,
  "pageViews" as page_views,
  "uniqueVisitors" as unique_visitors,
  logins
FROM hourly_activity_stats
WHERE hour >= NOW() - INTERVAL '24 hours'
ORDER BY hour ASC;
```

**Visualization**: Line chart (multi-line)

**Metabase Setup**:
1. Native query → Paste SQL
2. X-axis format: "HH:mm"
3. Three lines for different metrics

---

### 12. Average Hourly Activity (By Hour of Day)

**What it shows**: Typical activity pattern across all hours (0-23)

**Why it's useful**: Understand user behavior patterns, timezone considerations

**SQL Query**:
```sql
SELECT
  EXTRACT(HOUR FROM hour) as hour_of_day,
  ROUND(AVG("pageViews"), 0) as avg_page_views,
  ROUND(AVG("uniqueVisitors"), 0) as avg_unique_visitors,
  ROUND(AVG(logins), 0) as avg_logins
FROM hourly_activity_stats
WHERE hour >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM hour)
ORDER BY hour_of_day ASC;
```

**Visualization**: Bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Grouped bar chart showing all three metrics
3. X-axis: 0-23 (hours)

---

## Revenue & Subscriptions Dashboard

Track subscription changes, revenue, churn, and monetization metrics.

### 13. Monthly Recurring Revenue (MRR)

**What it shows**: Total revenue per month

**Why it's useful**: Key SaaS metric for business health

**SQL Query**:
```sql
SELECT
  DATE_TRUNC('month', date) as month,
  SUM(revenue) as total_revenue,
  COUNT(DISTINCT date) as days_in_period,
  ROUND(AVG(revenue), 2) as avg_daily_revenue
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month ASC;
```

**Visualization**: Bar chart with trend line

**Metabase Setup**:
1. Native query → Paste SQL
2. Bar chart for total_revenue
3. Add trend line

---

### 14. Paid vs Free Users Over Time

**What it shows**: User base composition by subscription status

**Why it's useful**: Track conversion funnel, monetization success

**SQL Query**:
```sql
SELECT
  date,
  "paidUsers" as paid_users,
  "freeUsers" as free_users,
  "totalUsers" as total_users,
  ROUND(("paidUsers"::numeric / NULLIF("totalUsers", 0)) * 100, 2) as paid_percentage
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY date ASC;
```

**Visualization**: Stacked area chart with percentage line

**Metabase Setup**:
1. Native query → Paste SQL
2. Stacked area for paid/free users
3. Overlay line for paid_percentage

---

### 15. New Subscriptions & Cancellations

**What it shows**: Daily subscription changes and net growth

**Why it's useful**: Track sales performance and churn

**SQL Query**:
```sql
SELECT
  date,
  "newSubscriptions" as new_subs,
  "cancelledSubscriptions" as cancelled_subs,
  "newSubscriptions" - "cancelledSubscriptions" as net_growth
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**Visualization**: Bar chart (grouped with positive/negative colors)

**Metabase Setup**:
1. Native query → Paste SQL
2. Grouped bars: green for new, red for cancelled
3. Add net_growth as line overlay

---

### 16. Subscription Churn Rate

**What it shows**: Monthly churn percentage

**Why it's useful**: Critical retention metric (< 5% is healthy for SaaS)

**SQL Query**:
```sql
WITH monthly_stats AS (
  SELECT
    DATE_TRUNC('month', date) as month,
    SUM("cancelledSubscriptions") as total_cancelled,
    AVG("paidUsers") as avg_paid_users
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', date)
)
SELECT
  month,
  total_cancelled,
  ROUND(avg_paid_users, 0) as avg_paid_users,
  ROUND(
    (total_cancelled::numeric / NULLIF(avg_paid_users, 0)) * 100,
    2
  ) as monthly_churn_rate_pct
FROM monthly_stats
ORDER BY month ASC;
```

**Visualization**: Line chart with goal line

**Metabase Setup**:
1. Native query → Paste SQL
2. Primary line: monthly_churn_rate_pct
3. Add goal line at 5% threshold

---

### 17. Average Revenue Per User (ARPU)

**What it shows**: Revenue divided by paid users

**Why it's useful**: Pricing strategy validation, upsell opportunities

**SQL Query**:
```sql
SELECT
  DATE_TRUNC('month', date) as month,
  SUM(revenue) as total_revenue,
  ROUND(AVG("paidUsers"), 0) as avg_paid_users,
  ROUND(
    SUM(revenue) / NULLIF(AVG("paidUsers"), 0),
    2
  ) as arpu
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month ASC;
```

**Visualization**: Bar chart with trend line

**Metabase Setup**:
1. Native query → Paste SQL
2. Bars for ARPU per month
3. Add trend line to show direction

---

### 18. Subscription Change Details (Raw Events)

**What it shows**: Recent subscription events with all details

**Why it's useful**: Investigate individual subscription changes, support issues

**SQL Query**:
```sql
SELECT
  timestamp,
  "userId",
  "changeType",
  "fromStatus" || ' → ' || "toStatus" as status_change,
  COALESCE("fromPlan", 'none') || ' → ' || COALESCE("toPlan", 'none') as plan_change,
  amount,
  currency,
  "paymentMethod",
  reason
FROM subscription_change_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 100;
```

**Visualization**: Table

**Metabase Setup**:
1. Native query → Paste SQL
2. Table visualization
3. Add filters for changeType, date range

---

## Feature Adoption Dashboard

Track which features are being used, by whom, and how often.

### 19. Most Used Features (Last 30 Days)

**What it shows**: Top features by total usage count

**Why it's useful**: Prioritize development, identify popular features

**SQL Query**:
```sql
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
```

**Visualization**: Horizontal bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Horizontal bars sorted by total_uses
3. Color gradient by value

---

### 20. Feature Adoption Over Time

**What it shows**: Daily usage of specific feature

**Why it's useful**: Track feature launches, measure adoption curves

**SQL Query**:
```sql
SELECT
  date,
  "featureName",
  "totalUses" as uses,
  "uniqueUsers" as users
FROM feature_usage_stats
WHERE
  date >= CURRENT_DATE - INTERVAL '90 days'
  AND "featureName" IN ('2FA_Setup', 'Profile_Update', 'Dashboard_View')
ORDER BY date ASC, "featureName";
```

**Visualization**: Line chart (multi-line, one per feature)

**Metabase Setup**:
1. Native query → Paste SQL
2. Multiple lines, one per feature
3. Add parameter to filter by feature names

---

### 21. Free vs Paid Feature Usage

**What it shows**: How free and paid users use features differently

**Why it's useful**: Identify features to paywall, upgrade drivers

**SQL Query**:
```sql
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
```

**Visualization**: Grouped bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Grouped bars: blue for free, green for paid
3. Sort by total_uses descending

---

### 22. Feature Engagement Rate

**What it shows**: What percentage of active users use each feature

**Why it's useful**: Measure feature discoverability and value

**SQL Query**:
```sql
WITH feature_stats AS (
  SELECT
    "featureName",
    SUM("uniqueUsers") as feature_users
  FROM feature_usage_stats
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY "featureName"
),
total_active AS (
  SELECT SUM("activeUsers") as active_users
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
  f."featureName",
  f.feature_users,
  t.active_users,
  ROUND(
    (f.feature_users::numeric / NULLIF(t.active_users, 0)) * 100,
    2
  ) as engagement_rate_pct
FROM feature_stats f
CROSS JOIN total_active t
ORDER BY engagement_rate_pct DESC;
```

**Visualization**: Horizontal bar chart with percentage

**Metabase Setup**:
1. Native query → Paste SQL
2. Horizontal bars showing engagement_rate_pct
3. Color code: green > 50%, yellow 20-50%, red < 20%

---

### 23. New Feature Adoption Curve

**What it shows**: How quickly users adopt a newly launched feature

**Why it's useful**: Measure feature launch success, compare launches

**SQL Query** (parameterized):
```sql
-- Replace 'Your_Feature_Name' with actual feature
WITH launch_date AS (
  SELECT MIN(date) as launch_day
  FROM feature_usage_stats
  WHERE "featureName" = 'Your_Feature_Name'
)
SELECT
  f.date,
  f.date - l.launch_day as days_since_launch,
  SUM(f."uniqueUsers") OVER (ORDER BY f.date) as cumulative_users,
  f."uniqueUsers" as new_users_today
FROM feature_usage_stats f
CROSS JOIN launch_date l
WHERE
  f."featureName" = 'Your_Feature_Name'
  AND f.date >= l.launch_day
ORDER BY f.date ASC;
```

**Visualization**: Area chart with line overlay

**Metabase Setup**:
1. Native query → Paste SQL
2. Add parameter for feature name
3. Area for cumulative_users, line for daily new users

---

## Device & Platform Dashboard

Understand your users' devices, browsers, and operating systems.

### 24. Mobile vs Desktop vs Tablet Usage

**What it shows**: User distribution across device types

**Why it's useful**: Responsive design priorities, platform-specific features

**SQL Query**:
```sql
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
```

**Visualization**: Stacked area chart (100% stacked)

**Metabase Setup**:
1. Native query → Paste SQL
2. 100% stacked area showing device distribution
3. Colors: mobile (blue), desktop (green), tablet (orange)

---

### 25. Browser Distribution

**What it shows**: Which browsers your users use

**Why it's useful**: Browser testing priorities, compatibility decisions

**SQL Query**:
```sql
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
```

**Visualization**: Pie chart or donut chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Pie/donut chart showing browser share
3. Show percentages on slices

---

### 26. Operating System Distribution

**What it shows**: OS breakdown of your user base

**Why it's useful**: Platform-specific development priorities

**SQL Query**:
```sql
SELECT
  os,
  "osVersion",
  COUNT(*) as sessions,
  COUNT(DISTINCT "userId") as unique_users
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '30 days'
  AND os IS NOT NULL
GROUP BY os, "osVersion"
ORDER BY sessions DESC
LIMIT 15;
```

**Visualization**: Horizontal bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Horizontal bars grouped by OS
3. Stack versions within each OS

---

### 27. Device Type Trend Over Time

**What it shows**: How device usage changes over time

**Why it's useful**: Identify mobile-first shift, seasonal patterns

**SQL Query**:
```sql
WITH weekly AS (
  SELECT
    DATE_TRUNC('week', date) as week,
    SUM("mobileUsers") as mobile,
    SUM("desktopUsers") as desktop,
    SUM("tabletUsers") as tablet
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '180 days'
  GROUP BY DATE_TRUNC('week', date)
)
SELECT
  week,
  mobile,
  desktop,
  tablet,
  ROUND((mobile::numeric / NULLIF(mobile + desktop + tablet, 0)) * 100, 2) as mobile_pct
FROM weekly
ORDER BY week ASC;
```

**Visualization**: Line chart (multi-line with percentage)

**Metabase Setup**:
1. Native query → Paste SQL
2. Three lines for device types
3. Right axis: mobile_pct

---

## Geographic Analytics Dashboard

Understand where your users are located.

### 28. Top Countries by Active Users

**What it shows**: Countries with most active users

**Why it's useful**: Localization priorities, timezone considerations

**SQL Query**:
```sql
SELECT
  country,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT "userId") as unique_users,
  COUNT(DISTINCT DATE(timestamp)) as days_active
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '30 days'
  AND country IS NOT NULL
GROUP BY country
ORDER BY unique_users DESC
LIMIT 20;
```

**Visualization**: Map or horizontal bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Map visualization (if Metabase supports)
3. Or horizontal bars sorted by users

---

### 29. Geographic Growth Trends

**What it shows**: How user base in each country grows over time

**Why it's useful**: Identify emerging markets, expansion opportunities

**SQL Query**:
```sql
WITH country_daily AS (
  SELECT
    DATE(timestamp) as date,
    country,
    COUNT(DISTINCT "userId") as active_users
  FROM user_activity_logs
  WHERE
    timestamp >= NOW() - INTERVAL '90 days'
    AND country IS NOT NULL
  GROUP BY DATE(timestamp), country
)
SELECT
  date,
  country,
  active_users,
  SUM(active_users) OVER (
    PARTITION BY country
    ORDER BY date
  ) as cumulative_users
FROM country_daily
WHERE country IN (
  SELECT country
  FROM country_daily
  GROUP BY country
  ORDER BY SUM(active_users) DESC
  LIMIT 5
)
ORDER BY date ASC, country;
```

**Visualization**: Line chart (multi-line, one per country)

**Metabase Setup**:
1. Native query → Paste SQL
2. Multiple lines, one per top country
3. Use distinct colors per country

---

### 30. City-Level Activity (Top Cities)

**What it shows**: Most active cities globally

**Why it's useful**: Targeted marketing, local partnerships

**SQL Query**:
```sql
SELECT
  city,
  country,
  COUNT(*) as sessions,
  COUNT(DISTINCT "userId") as unique_users,
  COUNT(DISTINCT DATE(timestamp)) as active_days
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '30 days'
  AND city IS NOT NULL
GROUP BY city, country
ORDER BY unique_users DESC
LIMIT 30;
```

**Visualization**: Table with conditional formatting

**Metabase Setup**:
1. Native query → Paste SQL
2. Table visualization
3. Heat map colors based on unique_users

---

## Performance & Errors Dashboard

Monitor application health, errors, and performance.

### 31. Error Rate Trend

**What it shows**: Application error rate over time

**Why it's useful**: Detect regressions, monitor deployments

**SQL Query**:
```sql
SELECT
  hour,
  "pageViews",
  errors,
  "errorRate" as error_rate_pct,
  "apiCalls"
FROM hourly_activity_stats
WHERE hour >= NOW() - INTERVAL '7 days'
ORDER BY hour ASC;
```

**Visualization**: Line chart with shaded threshold

**Metabase Setup**:
1. Native query → Paste SQL
2. Primary line: error_rate_pct
3. Shade red above 1% threshold
4. Secondary bars: errors (absolute count)

---

### 32. Error Spike Detection

**What it shows**: Hours with abnormally high error rates

**Why it's useful**: Incident detection and investigation

**SQL Query**:
```sql
WITH stats AS (
  SELECT
    AVG("errorRate") as avg_error_rate,
    STDDEV("errorRate") as stddev_error_rate
  FROM hourly_activity_stats
  WHERE hour >= NOW() - INTERVAL '7 days'
)
SELECT
  h.hour,
  h.errors,
  h."errorRate" as error_rate,
  s.avg_error_rate,
  s.avg_error_rate + (2 * s.stddev_error_rate) as threshold
FROM hourly_activity_stats h
CROSS JOIN stats s
WHERE
  h.hour >= NOW() - INTERVAL '24 hours'
  AND h."errorRate" > s.avg_error_rate + (2 * s.stddev_error_rate)
ORDER BY h.hour DESC;
```

**Visualization**: Table with alert indicators

**Metabase Setup**:
1. Native query → Paste SQL
2. Table with red highlighting for spikes
3. Set up alert to email when results > 0

---

### 33. Recent Error Logs

**What it shows**: Latest application errors with context

**Why it's useful**: Debug issues, monitor error patterns

**SQL Query**:
```sql
SELECT
  timestamp,
  category,
  message,
  "userId",
  "requestId",
  metadata
FROM app_logs
WHERE
  level = 'ERROR'
  AND timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 100;
```

**Visualization**: Table

**Metabase Setup**:
1. Native query → Paste SQL
2. Table with expandable metadata column
3. Add filters for category, time range

---

### 34. Error Categories Breakdown

**What it shows**: Which parts of the app have most errors

**Why it's useful**: Prioritize bug fixes, identify problem areas

**SQL Query**:
```sql
SELECT
  category,
  COUNT(*) as error_count,
  COUNT(DISTINCT "userId") as affected_users,
  COUNT(DISTINCT "requestId") as affected_requests,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence
FROM app_logs
WHERE
  level = 'ERROR'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY error_count DESC;
```

**Visualization**: Horizontal bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Horizontal bars sorted by error_count
3. Color code by severity

---

### 35. API Response Time (Estimated)

**What it shows**: Average API call duration

**Why it's useful**: Performance monitoring, identify slow endpoints

**SQL Query**:
```sql
SELECT
  DATE(timestamp) as date,
  resource,
  COUNT(*) as call_count,
  ROUND(AVG(duration), 0) as avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration), 0) as p95_duration_ms
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '7 days'
  AND duration IS NOT NULL
  AND resource IS NOT NULL
GROUP BY DATE(timestamp), resource
HAVING COUNT(*) > 10
ORDER BY date DESC, avg_duration_ms DESC
LIMIT 50;
```

**Visualization**: Table with heat map

**Metabase Setup**:
1. Native query → Paste SQL
2. Table with heat map on duration columns
3. Filter by resource name

---

## Real-Time Monitoring Dashboard

Live metrics for operations monitoring.

### 36. Current Hour Activity

**What it shows**: Activity in the current hour so far

**Why it's useful**: Real-time monitoring, incident detection

**SQL Query**:
```sql
SELECT
  DATE_TRUNC('hour', NOW()) as current_hour,
  COUNT(*) as events_this_hour,
  COUNT(DISTINCT "userId") as unique_users_this_hour,
  COUNT(CASE WHEN activity = 'PAGE_VIEW' THEN 1 END) as page_views,
  COUNT(CASE WHEN activity = 'FEATURE_USE' THEN 1 END) as feature_uses
FROM user_activity_logs
WHERE timestamp >= DATE_TRUNC('hour', NOW());
```

**Visualization**: Single value metrics (dashboard cards)

**Metabase Setup**:
1. Native query → Paste SQL
2. Create separate single-value cards for each metric
3. Auto-refresh every 1 minute

---

### 37. Recent User Activity Stream

**What it shows**: Latest 50 user activities

**Why it's useful**: Live monitoring, user support

**SQL Query**:
```sql
SELECT
  timestamp,
  "userId",
  activity,
  resource,
  action,
  "deviceType",
  country
FROM user_activity_logs
ORDER BY timestamp DESC
LIMIT 50;
```

**Visualization**: Table (auto-refresh)

**Metabase Setup**:
1. Native query → Paste SQL
2. Table with timestamp formatting
3. Auto-refresh every 30 seconds

---

### 38. Active Users Right Now

**What it shows**: Users active in last 5 minutes

**Why it's useful**: Real-time monitoring, capacity planning

**SQL Query**:
```sql
SELECT
  COUNT(DISTINCT "userId") as active_users_last_5min,
  COUNT(*) as total_events_last_5min,
  COUNT(DISTINCT country) as countries_active
FROM user_activity_logs
WHERE timestamp >= NOW() - INTERVAL '5 minutes';
```

**Visualization**: Single value metric (large number)

**Metabase Setup**:
1. Native query → Paste SQL
2. Single value card showing active users
3. Auto-refresh every 30 seconds
4. Green color if > threshold

---

### 39. Errors in Last Hour

**What it shows**: Recent error count

**Why it's useful**: Deployment monitoring, quick incident detection

**SQL Query**:
```sql
SELECT
  COUNT(*) as errors_last_hour,
  COUNT(DISTINCT category) as affected_categories,
  COUNT(DISTINCT "userId") as affected_users
FROM app_logs
WHERE
  level = 'ERROR'
  AND timestamp >= NOW() - INTERVAL '1 hour';
```

**Visualization**: Single value metric with alert threshold

**Metabase Setup**:
1. Native query → Paste SQL
2. Single value card
3. Red if errors > 10, yellow if > 5, green otherwise
4. Set up alert for threshold breach

---

## User Retention Dashboard

Measure how well you retain users over time.

### 40. Cohort Retention (7-Day)

**What it shows**: What % of users come back after signup

**Why it's useful**: Core retention metric, product-market fit indicator

**SQL Query**:
```sql
WITH user_cohorts AS (
  SELECT
    "userId",
    DATE(created_at) as signup_date
  FROM users
  WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
),
login_activity AS (
  SELECT
    "userId",
    DATE(timestamp) as login_date
  FROM session_logs
  WHERE
    event = 'LOGIN'
    AND success = true
    AND timestamp >= CURRENT_DATE - INTERVAL '60 days'
)
SELECT
  c.signup_date as cohort_date,
  COUNT(DISTINCT c."userId") as cohort_size,
  COUNT(DISTINCT CASE
    WHEN l.login_date BETWEEN c.signup_date + 1 AND c.signup_date + 7
    THEN c."userId"
  END) as returned_day_1_7,
  ROUND(
    COUNT(DISTINCT CASE
      WHEN l.login_date BETWEEN c.signup_date + 1 AND c.signup_date + 7
      THEN c."userId"
    END)::numeric / NULLIF(COUNT(DISTINCT c."userId"), 0) * 100,
    2
  ) as retention_pct_day_1_7
FROM user_cohorts c
LEFT JOIN login_activity l ON c."userId" = l."userId"
GROUP BY c.signup_date
HAVING COUNT(DISTINCT c."userId") > 5
ORDER BY c.signup_date DESC
LIMIT 30;
```

**Visualization**: Line chart showing retention curve

**Metabase Setup**:
1. Native query → Paste SQL
2. Line chart: retention_pct_day_1_7 over time
3. Add goal line at 40% (good retention benchmark)

---

### 41. Weekly Cohort Retention Matrix

**What it shows**: Retention grid by signup week

**Why it's useful**: Visual retention patterns, identify improvement

**SQL Query**:
```sql
WITH user_cohorts AS (
  SELECT
    "userId",
    DATE_TRUNC('week', created_at) as cohort_week
  FROM users
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 weeks'
),
weekly_activity AS (
  SELECT
    "userId",
    DATE_TRUNC('week', timestamp) as activity_week
  FROM session_logs
  WHERE
    event = 'LOGIN'
    AND success = true
    AND timestamp >= CURRENT_DATE - INTERVAL '12 weeks'
  GROUP BY "userId", DATE_TRUNC('week', timestamp)
)
SELECT
  c.cohort_week,
  COUNT(DISTINCT c."userId") as cohort_size,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week THEN c."userId" END) as week_0,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '1 week' THEN c."userId" END) as week_1,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '2 weeks' THEN c."userId" END) as week_2,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '3 weeks' THEN c."userId" END) as week_3,
  COUNT(DISTINCT CASE WHEN a.activity_week = c.cohort_week + INTERVAL '4 weeks' THEN c."userId" END) as week_4
FROM user_cohorts c
LEFT JOIN weekly_activity a ON c."userId" = a."userId"
GROUP BY c.cohort_week
ORDER BY c.cohort_week DESC;
```

**Visualization**: Table with heat map

**Metabase Setup**:
1. Native query → Paste SQL
2. Table visualization
3. Heat map formatting on percentage columns
4. Green (high) to red (low)

---

### 42. User Resurrection (Returning After 30+ Days Inactive)

**What it shows**: Users who return after long absence

**Why it's useful**: Measure re-engagement campaign success

**SQL Query**:
```sql
WITH user_last_login AS (
  SELECT
    "userId",
    MAX(timestamp) as last_login_before,
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY timestamp DESC) as rn
  FROM session_logs
  WHERE
    event = 'LOGIN'
    AND success = true
    AND timestamp < CURRENT_DATE - INTERVAL '30 days'
  GROUP BY "userId", timestamp
),
recent_logins AS (
  SELECT
    "userId",
    MIN(timestamp) as first_login_after
  FROM session_logs
  WHERE
    event = 'LOGIN'
    AND success = true
    AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY "userId"
)
SELECT
  DATE(r.first_login_after) as resurrection_date,
  COUNT(DISTINCT r."userId") as resurrected_users,
  ROUND(AVG(EXTRACT(DAY FROM r.first_login_after - u.last_login_before)), 1) as avg_days_dormant
FROM recent_logins r
JOIN user_last_login u ON r."userId" = u."userId"
WHERE
  r.first_login_after - u.last_login_before >= INTERVAL '30 days'
GROUP BY DATE(r.first_login_after)
ORDER BY resurrection_date DESC;
```

**Visualization**: Bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Bar chart showing resurrected_users per day

---

## Advanced Analytics

Complex queries for deep insights.

### 43. User Lifetime Value (LTV) Estimate

**What it shows**: Average revenue per user over lifetime

**Why it's useful**: Customer acquisition cost (CAC) benchmarking

**SQL Query**:
```sql
WITH user_revenue AS (
  SELECT
    "userId",
    SUM(amount) as total_spent,
    MIN(timestamp) as first_purchase,
    MAX(timestamp) as last_purchase,
    COUNT(*) as purchase_count
  FROM subscription_change_logs
  WHERE
    "changeType" IN ('UPGRADE', 'RENEW')
    AND amount > 0
  GROUP BY "userId"
)
SELECT
  DATE_TRUNC('month', u.created_at) as cohort_month,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT r."userId") as paying_users,
  ROUND(AVG(r.total_spent), 2) as avg_ltv,
  ROUND(SUM(r.total_spent) / NULLIF(COUNT(DISTINCT u.id), 0), 2) as ltv_per_user_in_cohort
FROM users u
LEFT JOIN user_revenue r ON u.id = r."userId"
WHERE u.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', u.created_at)
ORDER BY cohort_month DESC;
```

**Visualization**: Bar chart with line overlay

**Metabase Setup**:
1. Native query → Paste SQL
2. Bars for ltv_per_user_in_cohort
3. Line for paying_users percentage

---

### 44. Feature Correlation with Conversion

**What it shows**: Which features are used by users who convert to paid

**Why it's useful**: Identify "aha moment" features, improve onboarding

**SQL Query**:
```sql
WITH paid_users AS (
  SELECT DISTINCT "userId"
  FROM users
  WHERE "isPaid" = true
),
feature_usage AS (
  SELECT
    "userId",
    "resource" as feature_name,
    COUNT(*) as usage_count
  FROM user_activity_logs
  WHERE
    activity = 'FEATURE_USE'
    AND "resource" IS NOT NULL
  GROUP BY "userId", "resource"
)
SELECT
  f.feature_name,
  COUNT(DISTINCT CASE WHEN p."userId" IS NOT NULL THEN f."userId" END) as paid_users_using,
  COUNT(DISTINCT CASE WHEN p."userId" IS NULL THEN f."userId" END) as free_users_using,
  ROUND(
    COUNT(DISTINCT CASE WHEN p."userId" IS NOT NULL THEN f."userId" END)::numeric /
    NULLIF(COUNT(DISTINCT f."userId"), 0) * 100,
    2
  ) as paid_user_pct
FROM feature_usage f
LEFT JOIN paid_users p ON f."userId" = p."userId"
GROUP BY f.feature_name
HAVING COUNT(DISTINCT f."userId") > 10
ORDER BY paid_user_pct DESC;
```

**Visualization**: Horizontal bar chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Horizontal bars showing paid_user_pct
3. Sort by percentage descending

---

### 45. User Journey Funnel

**What it shows**: Conversion funnel from signup to paid

**Why it's useful**: Identify drop-off points in conversion

**SQL Query**:
```sql
WITH funnel_steps AS (
  SELECT
    COUNT(DISTINCT id) as total_signups
  FROM users
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
),
email_verified AS (
  SELECT COUNT(DISTINCT id) as verified_users
  FROM users
  WHERE
    created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND "emailVerified" IS NOT NULL
),
profile_completed AS (
  SELECT COUNT(DISTINCT "userId") as completed_profile
  FROM user_activity_logs
  WHERE
    activity = 'FEATURE_USE'
    AND resource = 'Profile_Update'
    AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
),
paid_users AS (
  SELECT COUNT(DISTINCT id) as converted_users
  FROM users
  WHERE
    created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND "isPaid" = true
)
SELECT
  'Signup' as step,
  1 as step_order,
  f.total_signups as users,
  100.0 as pct_of_previous
FROM funnel_steps f
UNION ALL
SELECT
  'Email Verified' as step,
  2 as step_order,
  e.verified_users as users,
  ROUND((e.verified_users::numeric / NULLIF(f.total_signups, 0)) * 100, 2) as pct_of_previous
FROM email_verified e, funnel_steps f
UNION ALL
SELECT
  'Profile Completed' as step,
  3 as step_order,
  p.completed_profile as users,
  ROUND((p.completed_profile::numeric / NULLIF(e.verified_users, 0)) * 100, 2) as pct_of_previous
FROM profile_completed p, email_verified e
UNION ALL
SELECT
  'Converted to Paid' as step,
  4 as step_order,
  pa.converted_users as users,
  ROUND((pa.converted_users::numeric / NULLIF(p.completed_profile, 0)) * 100, 2) as pct_of_previous
FROM paid_users pa, profile_completed p
ORDER BY step_order;
```

**Visualization**: Funnel chart

**Metabase Setup**:
1. Native query → Paste SQL
2. Funnel visualization
3. Show percentages between steps

---

### 46. Daily Engagement Score

**What it shows**: Composite engagement metric

**Why it's useful**: Single metric for overall product health

**SQL Query**:
```sql
WITH daily_metrics AS (
  SELECT
    date,
    "activeUsers",
    "totalLogins",
    "totalPageViews",
    "newSubscriptions",
    ROUND(
      ("activeUsers"::numeric / NULLIF("totalUsers", 0)) * 30 +
      ("totalLogins"::numeric / NULLIF("activeUsers", 0)) * 20 +
      ("totalPageViews"::numeric / NULLIF("activeUsers", 0)) * 10 +
      ("newSubscriptions"::numeric / NULLIF("activeUsers", 0)) * 40,
      2
    ) as engagement_score
  FROM daily_user_stats
  WHERE date >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
  date,
  engagement_score,
  AVG(engagement_score) OVER (
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as engagement_score_7day_avg
FROM daily_metrics
ORDER BY date ASC;
```

**Visualization**: Line chart with smoothed average

**Metabase Setup**:
1. Native query → Paste SQL
2. Primary line: engagement_score (thin, light)
3. Secondary line: 7-day average (thick, bold)

---

## Summary

This document contains **46 production-ready SQL queries** organized into **10 dashboard categories**:

1. **User Growth** (5 queries) - Track signups, growth rate, user base expansion
2. **User Activity** (7 queries) - DAU/WAU/MAU, stickiness, logins, page views
3. **Revenue & Subscriptions** (6 queries) - MRR, churn, ARPU, conversion
4. **Feature Adoption** (5 queries) - Usage patterns, adoption curves, engagement
5. **Device & Platform** (4 queries) - Mobile/desktop split, browsers, OS
6. **Geographic** (3 queries) - Countries, cities, growth by region
7. **Performance & Errors** (5 queries) - Error rates, monitoring, debugging
8. **Real-Time Monitoring** (4 queries) - Live activity, current metrics
9. **User Retention** (3 queries) - Cohort analysis, resurrection, retention curves
10. **Advanced Analytics** (4 queries) - LTV, funnels, correlation, engagement scores

---

## Metabase Setup Guide

### Initial Setup

1. **Install Metabase via Docker**:
```bash
docker run -d -p 3001:3000 \
  -e "MB_DB_TYPE=postgres" \
  -e "MB_DB_DBNAME=your_db_name" \
  -e "MB_DB_PORT=5432" \
  -e "MB_DB_USER=your_db_user" \
  -e "MB_DB_PASS=your_db_password" \
  -e "MB_DB_HOST=host.docker.internal" \
  --name metabase \
  metabase/metabase:latest
```

2. **Access Metabase**: Open `http://localhost:3001`

3. **Connect Database**: Admin → Databases → Add database → PostgreSQL

### Creating Your First Dashboard

1. **New Dashboard**: Dashboards → New Dashboard → Name it (e.g., "User Growth")

2. **Add Question**:
   - Click "+ Add question"
   - Choose "Native query (SQL)"
   - Paste query from this document
   - Click "Visualize"

3. **Choose Visualization**: Click visualization type dropdown and select recommended type

4. **Configure Visualization**:
   - Set axis labels
   - Choose colors
   - Format numbers/dates
   - Add goal lines if needed

5. **Save to Dashboard**: Click "Save" → Add to dashboard

6. **Arrange & Resize**: Drag cards to arrange, resize as needed

### Best Practices

- **Auto-refresh**: Set dashboards to auto-refresh (1-5 minutes for monitoring dashboards)
- **Filters**: Add dashboard-level filters for date ranges
- **Parameters**: Use SQL parameters for dynamic queries
- **Alerts**: Set up alerts for critical metrics (errors, churn spikes)
- **Subscriptions**: Email daily/weekly dashboard summaries to stakeholders
- **Permissions**: Control who can see sensitive revenue data

### Recommended Dashboard Structure

1. **Executive Dashboard** (for leadership):
   - Total users, MRR, growth rate
   - DAU/MAU ratio
   - Churn rate
   - Top 3 features

2. **Product Dashboard** (for product team):
   - Feature adoption rates
   - User stickiness
   - Retention cohorts
   - Feature usage trends

3. **Engineering Dashboard** (for dev team):
   - Error rates
   - Performance metrics
   - Device/browser distribution
   - Recent errors table

4. **Marketing Dashboard** (for marketing):
   - Signup sources
   - Geographic distribution
   - Conversion funnel
   - User acquisition cost vs LTV

---

## Query Performance Tips

1. **Add indexes** for frequently queried columns:
```sql
CREATE INDEX idx_user_activity_timestamp ON user_activity_logs(timestamp);
CREATE INDEX idx_user_activity_userid ON user_activity_logs("userId");
CREATE INDEX idx_daily_stats_date ON daily_user_stats(date);
```

2. **Use aggregated tables** (DailyUserStats, HourlyActivityStats) instead of raw logs when possible

3. **Limit date ranges** - Always use WHERE clauses with time filters

4. **Test queries** in psql before adding to Metabase

5. **Cache results** - Set Metabase caching to 5-15 minutes for heavy queries

---

**Document Version**: 1.0
**Last Updated**: October 27, 2025
**Total Queries**: 46
**Dashboard Types**: 10
