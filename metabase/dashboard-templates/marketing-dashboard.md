# Marketing Dashboard Template

**Purpose**: User acquisition, conversion, and geographic insights for marketing team

**Recommended Layout**: 3 columns, 7 rows

---

## Row 1: Acquisition Metrics

### Card 1: New Users (This Month)
```sql
SELECT COUNT(*) as new_users
FROM users
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);
```
**Visualization**: Single number
**Compare to**: Last month

### Card 2: New Users (This Week)
```sql
SELECT COUNT(*) as new_users
FROM users
WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE);
```
**Visualization**: Single number

### Card 3: Conversion Rate
```sql
WITH signups AS (
  SELECT COUNT(*) as total
  FROM users
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
),
paid AS (
  SELECT COUNT(*) as converted
  FROM users
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND "isPaid" = true
)
SELECT ROUND(
  (p.converted::numeric / NULLIF(s.total, 0)) * 100,
  1
) as conversion_rate_pct
FROM signups s, paid p;
```
**Visualization**: Single number
**Format**: Percentage

---

## Row 2-3: Signup Trends

### Chart 1: Daily Signups (Last 90 Days)
**Query**: `user-growth/01-daily-new-users.sql`
**Visualization**: Line chart
**Width**: Full (3 columns)
**Note**: Add markers for marketing campaigns

---

## Row 4: Weekly Performance

### Chart 2: Weekly Signups with Week-over-Week Change
**Query**: `user-growth/04-weekly-signup-summary.sql` (from main docs)
**Visualization**: Table with conditional formatting
**Width**: Full (3 columns)
**Colors**: Green for positive change, red for negative

---

## Row 5: Geographic Distribution

### Chart 3: Top 10 Countries
**Query**: `geography/01-top-countries.sql`
**Visualization**: Horizontal bar chart
**Width**: 2 columns

### Chart 4: Top 10 Cities
```sql
SELECT
  city,
  country,
  COUNT(DISTINCT "userId") as unique_users
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '30 days'
  AND city IS NOT NULL
GROUP BY city, country
ORDER BY unique_users DESC
LIMIT 10;
```
**Visualization**: Table
**Width**: 1 column

---

## Row 6: Conversion Funnel

### Chart 5: User Journey Funnel
**Query**: `advanced/03-user-journey-funnel.sql` (from main docs)
**Visualization**: Funnel chart
**Width**: Full (3 columns)
**Steps**: Signup → Email Verified → Profile Complete → Paid

---

## Row 7: Monthly Acquisition

### Chart 6: Monthly New Users (Last 12 Months)
**Query**: `user-growth/05-monthly-user-acquisition.sql` (from main docs)
**Visualization**: Bar chart
**Width**: Full (3 columns)

---

## Settings

- **Auto-refresh**: Every 1 hour
- **Filters**: Add date range and country filters
- **Access**: Share with marketing team
- **Subscriptions**: Monday morning summary at 9 AM

---

## Campaign Tracking

To track marketing campaigns, add source tracking to your signup flow:

```typescript
// Add to signup tracking
await trackActivity({
  userId: newUser.id,
  activity: "SIGNUP",
  metadata: {
    source: searchParams.get("utm_source"),
    medium: searchParams.get("utm_medium"),
    campaign: searchParams.get("utm_campaign"),
  },
})
```

Then create custom query:
```sql
SELECT
  metadata->>'source' as source,
  COUNT(*) as signups,
  COUNT(CASE WHEN u."isPaid" THEN 1 END) as conversions
FROM user_activity_logs l
JOIN users u ON l."userId" = u.id
WHERE
  l.activity = 'SIGNUP'
  AND l.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY metadata->>'source'
ORDER BY signups DESC;
```

---

## Key Marketing Questions This Answers

1. **How many users are we acquiring?** (Acquisition metrics)
2. **Is acquisition accelerating or declining?** (Signup trends)
3. **Where are our users coming from?** (Geographic charts)
4. **Where do users drop off?** (Conversion funnel)
5. **Which campaigns are working?** (Campaign tracking - if implemented)
