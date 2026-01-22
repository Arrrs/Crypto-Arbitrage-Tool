# Executive Dashboard Template

**Purpose**: High-level metrics for leadership and board presentations

**Recommended Layout**: 4 columns, 6 rows

---

## Row 1: Key Metrics (Single Number Cards)

### Card 1: Total Users
```sql
SELECT "totalUsers" as total_users
FROM daily_user_stats
ORDER BY date DESC
LIMIT 1;
```
**Visualization**: Single number (large)
**Color**: Blue

### Card 2: Monthly Recurring Revenue
```sql
SELECT SUM(revenue) as mrr
FROM daily_user_stats
WHERE date >= DATE_TRUNC('month', CURRENT_DATE);
```
**Visualization**: Single number (large)
**Color**: Green
**Format**: Currency ($)

### Card 3: Growth Rate (This Month)
```sql
WITH current_month AS (
  SELECT COUNT(*) as current
  FROM users
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
),
last_month AS (
  SELECT COUNT(*) as previous
  FROM users
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND created_at < DATE_TRUNC('month', CURRENT_DATE)
)
SELECT ROUND(
  ((c.current - l.previous)::numeric / NULLIF(l.previous, 0)) * 100,
  1
) as growth_rate_pct
FROM current_month c, last_month l;
```
**Visualization**: Single number
**Color**: Green if positive, red if negative
**Format**: Percentage (%)

### Card 4: DAU/MAU Ratio (Stickiness)
```sql
WITH latest AS (
  SELECT date, "activeUsers" as dau
  FROM daily_user_stats
  ORDER BY date DESC
  LIMIT 30
)
SELECT ROUND(
  (SELECT dau FROM latest ORDER BY date DESC LIMIT 1)::numeric /
  NULLIF((SELECT SUM(dau) FROM latest), 0) * 100,
  1
) as stickiness_pct;
```
**Visualization**: Single number
**Color**: Green if > 20%, yellow if 10-20%, red if < 10%
**Format**: Percentage (%)

---

## Row 2-3: User Growth (Line Charts)

### Chart 1: New Users Trend (2 columns wide)
**Query**: `user-growth/01-daily-new-users.sql`
**Visualization**: Line chart with dual axis
**Time range**: Last 90 days

### Chart 2: Total Users Over Time (2 columns wide)
**Query**: `user-growth/03-total-users.sql`
**Visualization**: Area chart
**Time range**: Last 180 days

---

## Row 4-5: Revenue & Engagement (Mixed)

### Chart 3: MRR Trend (2 columns wide)
**Query**: `revenue/01-monthly-recurring-revenue.sql`
**Visualization**: Bar chart with trend line
**Time range**: Last 12 months

### Chart 4: User Stickiness (2 columns wide)
**Query**: `user-activity/03-user-stickiness.sql`
**Visualization**: Line chart with goal line at 20%
**Time range**: Last 30 days

---

## Row 6: Distribution (Pie Charts)

### Chart 5: Paid vs Free Users (2 columns)
```sql
SELECT
  "paidUsers" as paid_users,
  "freeUsers" as free_users
FROM daily_user_stats
ORDER BY date DESC
LIMIT 1;
```
**Visualization**: Pie chart
**Colors**: Green for paid, gray for free

### Chart 6: Device Distribution (2 columns)
```sql
SELECT
  "mobileUsers" as mobile,
  "desktopUsers" as desktop,
  "tabletUsers" as tablet
FROM daily_user_stats
ORDER BY date DESC
LIMIT 1;
```
**Visualization**: Donut chart
**Colors**: Blue (mobile), green (desktop), orange (tablet)

---

## Settings

- **Auto-refresh**: Every 1 hour
- **Date filter**: Add dashboard-level date range filter
- **Access**: Share with executives and board members
- **Subscriptions**: Email daily summary at 8 AM

---

## Key Insights to Highlight

1. **User Growth Trajectory**: Are we growing or flat?
2. **Revenue Health**: Is MRR increasing month-over-month?
3. **Engagement Quality**: Stickiness ratio above 20%?
4. **Monetization**: What % of users are paying?
5. **Platform Mix**: Mobile vs desktop trends
