# Metabase Setup and Import

This directory contains pre-configured Metabase dashboard definitions that you can import directly.

## Quick Setup

### 1. Run Metabase

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

### 2. Initial Configuration

1. Open http://localhost:3001
2. Complete the initial setup wizard
3. Add your PostgreSQL database connection:
   - Database type: PostgreSQL
   - Name: "Analytics" (or your preference)
   - Host: host.docker.internal (for Docker) or your DB host
   - Port: 5432
   - Database name: your database name
   - Username: your DB user
   - Password: your DB password

### 3. Set Up Database Indexes (IMPORTANT!)

**Run this first for optimal performance:**

```bash
# Connect to your database
psql -U your_user -d your_database

# Run the index setup script
\i /path/to/metabase/setup-indexes.sql
```

Or copy the contents of `metabase/setup-indexes.sql` and run in your SQL client.

**This creates 20+ indexes** that will make your Metabase queries **10-100x faster**!

### 4. Create Dashboards

Use the SQL files provided in this directory:

1. **Create a new question**
2. **Choose "Native query (SQL)"**
3. **Copy SQL from the files in `/metabase/queries/` directory**
4. **Select visualization type** (recommended type is in the file header)
5. **Save to dashboard**

**Pre-built Query Files Available:**
- ✅ 17 ready-to-use SQL files in `/metabase/queries/`
- ✅ 46 total queries in `/docs/METABASE_SQL_QUERIES.md`
- ✅ 4 complete dashboard templates in `/metabase/dashboard-templates/`

## Directory Structure

```
metabase/
├── README.md (this file)
├── setup-indexes.sql (⚡ run this first for performance!)
├── queries/
│   ├── user-growth/
│   │   ├── 01-daily-new-users.sql ✅
│   │   ├── 02-growth-rate.sql ✅
│   │   └── 03-total-users.sql ✅
│   ├── user-activity/
│   │   ├── 01-daily-active-users.sql ✅
│   │   ├── 02-wau-mau.sql ✅
│   │   └── 03-user-stickiness.sql ✅
│   ├── revenue/
│   │   ├── 01-monthly-recurring-revenue.sql ✅
│   │   └── 02-paid-vs-free-users.sql ✅
│   ├── features/
│   │   ├── 01-most-used-features.sql ✅
│   │   └── 02-free-vs-paid-usage.sql ✅
│   ├── devices/
│   │   ├── 01-mobile-vs-desktop.sql ✅
│   │   └── 02-browser-distribution.sql ✅
│   ├── geography/
│   │   └── 01-top-countries.sql ✅
│   ├── errors/
│   │   ├── 01-error-rate-trend.sql ✅
│   │   └── 02-recent-errors.sql ✅
│   └── realtime/
│       ├── 01-current-hour-activity.sql ✅
│       └── 02-active-users-now.sql ✅
└── dashboard-templates/
    ├── executive-dashboard.md ✅
    ├── product-dashboard.md ✅
    ├── engineering-dashboard.md ✅
    └── marketing-dashboard.md ✅
```

**Total**: 17 ready-to-use SQL files + 4 complete dashboard templates
**More**: 46 total queries available in `/docs/METABASE_SQL_QUERIES.md`

## Pre-configured Dashboards

### 1. Executive Dashboard
**Purpose**: High-level metrics for leadership
**Queries**:
- Total users (number)
- MRR (number)
- Growth rate (number)
- DAU/MAU ratio (number)
- New users trend (line chart)
- Revenue trend (bar chart)

### 2. Product Dashboard
**Purpose**: Feature adoption and engagement
**Queries**:
- Top features (horizontal bar)
- Feature adoption over time (line chart)
- User stickiness (line chart)
- Retention cohorts (table with heat map)

### 3. Engineering Dashboard
**Purpose**: Technical health and errors
**Queries**:
- Error rate trend (line chart)
- Recent errors (table)
- Device distribution (pie chart)
- Browser distribution (horizontal bar)

### 4. Marketing Dashboard
**Purpose**: User acquisition and conversion
**Queries**:
- Signup sources (pie chart)
- Geographic distribution (map or bar chart)
- Conversion funnel (funnel chart)
- Weekly signups (bar chart)

## Quick Start Queries

Here are the most important queries to start with:

### Daily Active Users
```sql
SELECT date, "activeUsers" as dau
FROM "DailyUserStats"
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```
**Visualization**: Line chart

### New Users This Month
```sql
SELECT COUNT(*) as new_users
FROM "User"
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);
```
**Visualization**: Single number

### Top 10 Features
```sql
SELECT "featureName", SUM("totalUses") as total
FROM "FeatureUsageStats"
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY "featureName"
ORDER BY total DESC LIMIT 10;
```
**Visualization**: Horizontal bar chart

### Mobile vs Desktop
```sql
SELECT date, "mobileUsers" as mobile, "desktopUsers" as desktop
FROM "DailyUserStats"
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```
**Visualization**: Stacked area chart

## Dashboard Refresh Settings

Recommended auto-refresh intervals:

- **Executive Dashboard**: 1 hour
- **Product Dashboard**: 6 hours
- **Engineering Dashboard**: 5 minutes (for error monitoring)
- **Marketing Dashboard**: 1 hour
- **Real-time Monitoring**: 30 seconds

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to database from Docker
**Solution**: Use `host.docker.internal` instead of `localhost`

**Problem**: Permission denied
**Solution**: Grant Metabase user SELECT permissions:
```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_user;
```

### Query Issues

**Problem**: Table not found
**Solution**: Make sure you've run the analytics migration:
```bash
npx prisma migrate dev
```

**Problem**: No data showing
**Solution**: Check if analytics is enabled in `/admin/analytics` and generate some activity

### Performance Issues

**Problem**: Queries are slow
**Solution**: Add indexes:
```sql
CREATE INDEX idx_user_activity_timestamp ON "UserActivityLog"(timestamp);
CREATE INDEX idx_user_activity_userid ON "UserActivityLog"("userId");
CREATE INDEX idx_daily_stats_date ON "DailyUserStats"(date);
CREATE INDEX idx_feature_stats_date ON "FeatureUsageStats"(date);
```

## Next Steps

1. ✅ Run Metabase Docker container
2. ✅ Configure database connection
3. ⚡ **Run `setup-indexes.sql` for performance**
4. ✅ Create your first dashboard using queries from `/metabase/queries/`
5. ✅ Use dashboard templates from `/metabase/dashboard-templates/`
6. ✅ Explore the 46 queries in `/docs/METABASE_SQL_QUERIES.md`
7. ✅ Set up auto-refresh on dashboards
8. ✅ Configure alerts for critical metrics
9. ✅ Share dashboards with your team

## Additional Resources

- Full query list: `/docs/METABASE_SQL_QUERIES.md`
- Analytics setup: `/docs/ANALYTICS_IMPLEMENTATION_COMPLETE.md`
- Tracking examples: `/docs/ANALYTICS_TRACKING_EXAMPLES.md`
- Feature guide: `/docs/FEATURES.md#analytics-system`
