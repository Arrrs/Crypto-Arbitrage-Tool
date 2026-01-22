# Engineering Dashboard Template

**Purpose**: System health, errors, and technical metrics for engineering team

**Recommended Layout**: 3 columns, 6 rows

---

## Row 1: Critical Metrics (Auto-refresh every 5 minutes)

### Card 1: Errors (Last Hour)
**Query**: `realtime/03-errors-last-hour.sql` (from main docs)
**Visualization**: Single number
**Color**: Red if > 10, yellow if > 5, green otherwise

### Card 2: Active Users (Now)
**Query**: `realtime/02-active-users-now.sql`
**Visualization**: Single number
**Color**: Green

### Card 3: Error Rate (Last Hour)
```sql
SELECT ROUND("errorRate", 2) as error_rate_pct
FROM hourly_activity_stats
ORDER BY hour DESC
LIMIT 1;
```
**Visualization**: Single number
**Format**: Percentage
**Color**: Red if > 1%, yellow if > 0.5%, green otherwise

---

## Row 2-3: Error Trends (Full Width)

### Chart 1: Error Rate Over Last 7 Days
**Query**: `errors/01-error-rate-trend.sql`
**Visualization**: Line chart with shaded threshold
**Width**: Full (3 columns)
**Threshold**: Shade red above 1%

---

## Row 4: Recent Errors (Full Width)

### Table 1: Latest Errors (Last 24 Hours)
**Query**: `errors/02-recent-errors.sql`
**Visualization**: Table
**Width**: Full (3 columns)
**Columns**: timestamp, category, message, userId, requestId
**Features**: Expandable metadata, filterable by category

---

## Row 5: Platform Distribution

### Chart 2: Device Types
**Query**: `devices/01-mobile-vs-desktop.sql`
**Visualization**: Pie chart
**Width**: 1 column
**Time range**: Today

### Chart 3: Browser Distribution
**Query**: `devices/02-browser-distribution.sql`
**Visualization**: Donut chart
**Width**: 1 column
**Time range**: Last 30 days

### Chart 4: Operating Systems
```sql
SELECT
  os,
  COUNT(DISTINCT "userId") as users
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '30 days'
  AND os IS NOT NULL
GROUP BY os
ORDER BY users DESC
LIMIT 5;
```
**Visualization**: Horizontal bar chart
**Width**: 1 column

---

## Row 6: API Performance (if tracking enabled)

### Chart 5: API Response Times (p95)
```sql
SELECT
  DATE(timestamp) as date,
  resource,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration), 0) as p95_duration_ms
FROM user_activity_logs
WHERE
  timestamp >= NOW() - INTERVAL '7 days'
  AND duration IS NOT NULL
  AND resource IS NOT NULL
GROUP BY DATE(timestamp), resource
HAVING COUNT(*) > 10
ORDER BY date DESC, p95_duration_ms DESC
LIMIT 20;
```
**Visualization**: Table with heat map
**Width**: Full (3 columns)
**Note**: Only works if performance tracking is enabled

---

## Settings

- **Auto-refresh**: Every 5 minutes
- **Alerts**: Set up email alerts for error rate > 1%
- **Access**: Share with engineering team
- **Monitoring**: Pin this to office dashboard display

---

## Alerting Rules to Set Up

1. **Error Spike**: Alert if errors > 10 in last hour
2. **Error Rate**: Alert if error rate > 1% for 2 consecutive hours
3. **System Down**: Alert if active users drops to 0 during business hours
4. **Slow API**: Alert if p95 response time > 2000ms

---

## Key Engineering Questions This Answers

1. **Is the system healthy right now?** (Critical metrics)
2. **Are errors trending up or down?** (Error trend chart)
3. **What's breaking?** (Recent errors table)
4. **What browsers should we test?** (Browser distribution)
5. **Are APIs responding quickly?** (Performance chart)
