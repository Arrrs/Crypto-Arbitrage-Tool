# PostgreSQL Table Names Reference

**Important**: PostgreSQL table names created by Prisma use **snake_case**, not PascalCase.

This is because Prisma's default naming convention converts model names to snake_case in the database.

---

## Analytics Tables

| Prisma Model | PostgreSQL Table | Usage |
|--------------|------------------|-------|
| `AnalyticsSettings` | `analytics_settings` | Analytics configuration |
| `UserActivityLog` | `user_activity_logs` | Raw event tracking |
| `SubscriptionChangeLog` | `subscription_change_logs` | Payment events |
| `DailyUserStats` | `daily_user_stats` | Daily aggregated metrics |
| `HourlyActivityStats` | `hourly_activity_stats` | Hourly aggregated metrics |
| `FeatureUsageStats` | `feature_usage_stats` | Feature adoption data |

---

## Core Tables

| Prisma Model | PostgreSQL Table | Usage |
|--------------|------------------|-------|
| `User` | `users` | User accounts |
| `Account` | `accounts` | OAuth accounts |
| `Session` | `sessions` | NextAuth sessions |
| `VerificationToken` | `verification_tokens` | Email verification |

---

## Logging Tables

| Prisma Model | PostgreSQL Table | Usage |
|--------------|------------------|-------|
| `AppLog` | `app_logs` | Application logs (errors, warnings) |
| `AuditLog` | `audit_logs` | Admin action audit trail |
| `SessionLog` | `session_logs` | Login/logout events |
| `RateLimitLog` | `rate_limit_logs` | Rate limiting events |

---

## System Tables

| Prisma Model | PostgreSQL Table | Usage |
|--------------|------------------|-------|
| `SystemSettings` | `system_settings` | App configuration |
| `CronJob` | `cron_jobs` | Scheduled job definitions |
| `CronExecution` | `cron_executions` | Job execution history |
| `Alert` | `alerts` | Alert definitions |
| `AlertTrigger` | `alert_triggers` | Alert trigger history |

---

## Column Names

Column names **keep camelCase** in PostgreSQL:

```sql
-- ✅ Correct
SELECT "userId", "createdAt", "isPaid" FROM users;

-- ❌ Wrong
SELECT user_id, created_at, is_paid FROM users;
```

**Why?** Prisma's `@map()` attribute is not used by default, so column names remain as defined in the schema.

---

## Common Patterns in Queries

### Selecting from Analytics Tables

```sql
-- ✅ Correct
SELECT date, "activeUsers", "totalLogins"
FROM daily_user_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- ❌ Wrong (PascalCase table name)
SELECT date, "activeUsers", "totalLogins"
FROM "DailyUserStats"
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

### Joining Tables

```sql
-- ✅ Correct
SELECT u.email, l.activity, l.timestamp
FROM users u
JOIN user_activity_logs l ON u.id = l."userId"
WHERE l.timestamp >= NOW() - INTERVAL '24 hours';

-- ❌ Wrong
SELECT u.email, l.activity, l.timestamp
FROM "User" u
JOIN "UserActivityLog" l ON u.id = l."userId"
WHERE l.timestamp >= NOW() - INTERVAL '24 hours';
```

### Aggregating Data

```sql
-- ✅ Correct
SELECT
  "featureName",
  SUM("totalUses") as total
FROM feature_usage_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY "featureName";
```

---

## Quick Check Command

To verify table names in your database:

```bash
# List all tables
docker exec postgres psql -U postgres -d your_database -c "\dt"

# Describe a specific table
docker exec postgres psql -U postgres -d your_database -c "\d daily_user_stats"
```

---

## All Query Files Updated

All SQL query files in this project have been updated to use the correct table names:

- ✅ `/metabase/queries/**/*.sql` - All 17 query files
- ✅ `/docs/METABASE_SQL_QUERIES.md` - All 46 queries
- ✅ `/metabase/dashboard-templates/*.md` - All 4 templates
- ✅ `/metabase/setup-indexes.sql` - Index creation script

---

## If You See "Relation Does Not Exist" Error

This means the table name is wrong. Check:

1. **Table name is snake_case**: `daily_user_stats` not `"DailyUserStats"`
2. **Column names are camelCase with quotes**: `"userId"` not `user_id`
3. **Table actually exists**: Run `\dt` in psql to verify

---

**Last Updated**: October 29, 2025
**All queries tested and verified**: ✅
