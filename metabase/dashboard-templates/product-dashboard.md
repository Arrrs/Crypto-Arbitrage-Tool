# Product Dashboard Template

**Purpose**: Feature adoption, engagement, and user behavior for product team

**Recommended Layout**: 3 columns, 8 rows

---

## Row 1: Engagement Metrics

### Card 1: DAU
```sql
SELECT "activeUsers"
FROM daily_user_stats
ORDER BY date DESC
LIMIT 1;
```
**Visualization**: Single number

### Card 2: WAU
```sql
SELECT SUM("activeUsers") as wau
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
```
**Visualization**: Single number

### Card 3: MAU
```sql
SELECT SUM("activeUsers") as mau
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```
**Visualization**: Single number

---

## Row 2-3: Feature Usage (Full Width)

### Chart 1: Top 10 Features
**Query**: `features/01-most-used-features.sql`
**Visualization**: Horizontal bar chart
**Time range**: Last 30 days
**Width**: Full (3 columns)

---

## Row 4-5: Feature Adoption Over Time

### Chart 2: Feature Adoption Trends
**Query**: `features/02-feature-adoption-over-time.sql` (from main docs)
**Visualization**: Multi-line chart
**Time range**: Last 90 days
**Width**: Full (3 columns)
**Note**: Add parameter to filter by specific features

---

## Row 6-7: User Retention

### Chart 3: Cohort Retention Table
**Query**: `retention/02-weekly-cohort-retention.sql` (from main docs)
**Visualization**: Table with heat map
**Time range**: Last 12 weeks
**Width**: Full (3 columns)
**Colors**: Green (high retention) to red (low retention)

---

## Row 8: Free vs Paid Analysis

### Chart 4: Free vs Paid Feature Usage
**Query**: `features/02-free-vs-paid-usage.sql`
**Visualization**: Grouped bar chart
**Width**: 2 columns

### Chart 5: Paid User Percentage
```sql
SELECT
  ROUND(("paidUsers"::numeric / NULLIF("totalUsers", 0)) * 100, 1) as paid_pct
FROM daily_user_stats
ORDER BY date DESC
LIMIT 1;
```
**Visualization**: Gauge chart (if available) or single number
**Width**: 1 column
**Goal**: 10% (adjust based on your model)

---

## Settings

- **Auto-refresh**: Every 6 hours
- **Filters**: Add feature name filter
- **Access**: Share with product managers and designers
- **Subscriptions**: Weekly summary every Monday at 9 AM

---

## Key Product Questions This Answers

1. **Which features drive engagement?** (Top features chart)
2. **Are users adopting new features?** (Adoption trends)
3. **How well do we retain users?** (Cohort table)
4. **What features correlate with conversion?** (Free vs paid usage)
5. **Is our DAU/MAU healthy?** (Engagement metrics)
