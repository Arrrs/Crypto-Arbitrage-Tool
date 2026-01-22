# Analytics Quick Access Guide

**Everything you need to know to access and use the analytics system**

---

## 🎛️ Analytics Admin UI

**URL**: http://localhost:3000/admin/analytics

**What you can do**:
- ✅ Enable/disable different tracking types
- ✅ Set sampling rate (1-100%)
- ✅ Configure data retention periods
- ✅ Toggle async tracking
- ✅ See cron job schedule
- ✅ Save settings (clears cache automatically)

**Features**:
- Mobile-responsive design
- Real-time settings updates
- Cache clearing on save
- Full control over what data is tracked

**Screenshot locations**:
```
Header: "Analytics Settings"
Sections:
  1. Tracking Features (6 toggles)
  2. Performance Settings (sampling rate, batch size)
  3. Data Retention (raw data days, aggregated data days)
  4. How Analytics Works (info box)
  5. Scheduled Cron Jobs (info box)
  6. Save button
```

---

## 📊 Test Data Generated

You now have **realistic test data** to visualize:

| Data Type | Count | Time Period |
|-----------|-------|-------------|
| Test Users | 50 | - |
| Daily User Stats | 91 rows | Last 90 days |
| Hourly Activity Stats | 169 rows | Last 7 days |
| Feature Usage Stats | 310 rows | Last 30 days |
| User Activity Logs | 1,004 events | Last 7 days |
| Subscription Changes | 26 events | Last 60 days |

### What the test data includes:

**Daily User Stats** (90 days):
- Total/new/active users with growth trend
- Paid vs free user split (30% paid)
- Mobile/desktop/tablet usage distribution
- Login success/failure rates
- Page view counts
- Revenue tracking
- Subscription changes

**Hourly Activity Stats** (7 days):
- Page views by hour
- Unique visitors
- Login counts
- Error rates (with daily patterns)
- API call volumes

**Feature Usage** (30 days):
- 10 different features tracked
- Free vs paid user usage
- Unique users per feature
- Total usage counts

**User Activity** (1,000+ events):
- Page views
- Feature usage
- Device types (mobile/desktop/tablet)
- Browsers (Chrome, Firefox, Safari, Edge)
- Operating systems
- Geographic data (7 countries, multiple cities)
- Session durations

**Subscriptions** (26 events):
- Upgrades to paid plans
- Renewals
- Cancellations
- Revenue tracking

---

## 📈 Sample Queries You Can Run Now

### 1. Daily Active Users (Last 7 Days)

```sql
SELECT
  date,
  "activeUsers" as dau,
  "totalLogins" as total_logins
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date ASC;
```

**Expected result**: ~22-31 active users per day with growth trend

---

### 2. Mobile vs Desktop Usage

```sql
SELECT
  date,
  "mobileUsers" as mobile,
  "desktopUsers" as desktop,
  "tabletUsers" as tablet
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date ASC;
```

**Expected result**: Mobile ~40-50%, Desktop ~35-45%, Tablet ~10-20%

---

### 3. Top 10 Features

```sql
SELECT
  "featureName",
  SUM("totalUses") as total_uses,
  SUM("uniqueUsers") as unique_users
FROM feature_usage_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY "featureName"
ORDER BY total_uses DESC
LIMIT 10;
```

**Expected result**: 10 features with ~300-600 uses each

---

### 4. User Growth Over Time

```sql
SELECT
  date,
  "totalUsers" as total,
  "newUsers" as new,
  "paidUsers" as paid,
  "freeUsers" as free
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY date ASC;
```

**Expected result**: Growing from ~10 users to ~55 users over 90 days

---

### 5. Geographic Distribution

```sql
SELECT
  country,
  COUNT(*) as visits,
  COUNT(DISTINCT "userId") as unique_users
FROM user_activity_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY country
ORDER BY visits DESC;
```

**Expected result**: US (~40%), UK (~20%), CA (~15%), AU/DE (~10% each)

---

## 🚀 Quick Start in Metabase

### Step 1: Connect Database (if not already done)

1. Open Metabase: http://localhost:3001 (or your Metabase URL)
2. Click **Settings** → **Admin** → **Databases** → **Add database**
3. Fill in:
   - **Database type**: PostgreSQL
   - **Name**: NextAuth Analytics
   - **Host**: localhost (or host.docker.internal if in Docker)
   - **Port**: 5432
   - **Database name**: webapp_dev1
   - **Username**: postgres
   - **Password**: password
4. Click **Save**

### Step 2: Create Your First Dashboard

1. Click **+ New** → **Dashboard**
2. Name it: "User Analytics Overview"
3. Click **+ Add** → **Question** → **Native query**
4. Select database: "NextAuth Analytics"
5. **Copy query from** `/metabase/queries/user-growth/01-daily-new-users.sql`
6. Click **Visualize**
7. Choose **Line chart**
8. Click **Save** → Add to dashboard

### Step 3: Add More Charts

Use queries from:
- `/metabase/queries/user-activity/` - User engagement
- `/metabase/queries/devices/` - Device distribution
- `/metabase/queries/features/` - Feature usage
- `/metabase/queries/revenue/` - Revenue metrics

### Step 4: Use Dashboard Templates

Follow the complete layouts in:
- `/metabase/dashboard-templates/executive-dashboard.md`
- `/metabase/dashboard-templates/product-dashboard.md`
- `/metabase/dashboard-templates/engineering-dashboard.md`
- `/metabase/dashboard-templates/marketing-dashboard.md`

---

## 🔄 Regenerate Test Data

If you want fresh test data:

```bash
# Delete existing test data
docker exec postgres psql -U postgres -d webapp_dev1 -c "DELETE FROM user_activity_logs; DELETE FROM subscription_change_logs; DELETE FROM feature_usage_stats; DELETE FROM hourly_activity_stats; DELETE FROM daily_user_stats; DELETE FROM users WHERE email LIKE 'testuser%';"

# Generate new test data
npx tsx scripts/generate-test-analytics-data.ts
```

---

## 📍 File Locations

### Analytics Admin UI
- **Page**: `/app/admin/analytics/page.tsx`
- **API**: `/app/api/admin/analytics/settings/route.ts`
- **Access**: http://localhost:3000/admin/analytics

### SQL Queries (Ready to Use)
- **Organized queries**: `/metabase/queries/*/`
- **All 46 queries**: `/docs/METABASE_SQL_QUERIES.md`
- **Dashboard templates**: `/metabase/dashboard-templates/`

### Documentation
- **Complete guide**: `/docs/ANALYTICS_IMPLEMENTATION_COMPLETE.md`
- **Metabase setup**: `/metabase/README.md`
- **Table names**: `/metabase/TABLE_NAMES_REFERENCE.md`
- **Tracking examples**: `/docs/ANALYTICS_TRACKING_EXAMPLES.md`

### Scripts
- **Generate test data**: `/scripts/generate-test-analytics-data.ts`
- **Initialize cron jobs**: `/scripts/init-analytics-crons.ts`
- **Setup database**: `/scripts/setup-database.sh`

---

## ✅ Quick Checklist

Before using analytics in Metabase:

- [x] Database migrations run (analytics tables created)
- [x] Performance indexes created (queries are fast)
- [x] Test data generated (50 users, 90 days of data)
- [ ] Visit `/admin/analytics` to configure settings
- [ ] Connect Metabase to database
- [ ] Run sample queries to verify data
- [ ] Create your first dashboard
- [ ] Set up auto-refresh (optional)

---

## 🎯 What You Should See

### In Analytics Admin UI (`/admin/analytics`):
- 6 tracking toggles (all should be ON by default)
- Sampling rate slider (default: 100%)
- Retention periods (90 days raw, 365 days aggregated)
- Cron job schedule information
- Save button

### In Metabase Queries:
- **Daily stats**: 91 rows of data (last 90 days)
- **User count**: Growing from ~10 to ~55 users
- **Active users**: 22-31 per day (40-70% of total)
- **Mobile usage**: 40-50% of traffic
- **Features**: 10 different features with usage data
- **Geography**: Data from 7 countries
- **Subscriptions**: ~15 paid users with revenue data

### Sample Dashboard View:
```
┌─────────────────────────────────────────────┐
│  Total Users: 55       DAU: 28    MRR: $450 │
├─────────────────────────────────────────────┤
│  [Line Chart: Daily Active Users]           │
│  Shows growth from 4 to 28 over 90 days     │
├─────────────────────────────────────────────┤
│  [Pie Chart: Mobile vs Desktop]             │
│  Mobile: 45%  Desktop: 40%  Tablet: 15%     │
├─────────────────────────────────────────────┤
│  [Bar Chart: Top Features]                  │
│  Report_Generate, Search_Feature, etc.      │
└─────────────────────────────────────────────┘
```

---

**Everything is ready to use! Start with the Analytics Admin UI, then move to Metabase to create dashboards.**
