-- Analytics Database Indexes for Metabase Performance
-- Run this after creating the analytics tables to improve query performance
-- Uses snake_case table names (Prisma default mapping)

-- ========================================
-- user_activity_logs Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp
ON "user_activity_logs"(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_userid
ON "user_activity_logs"("userId");

CREATE INDEX IF NOT EXISTS idx_user_activity_activity
ON "user_activity_logs"(activity);

CREATE INDEX IF NOT EXISTS idx_user_activity_resource
ON "user_activity_logs"(resource);

CREATE INDEX IF NOT EXISTS idx_user_activity_device
ON "user_activity_logs"("deviceType");

CREATE INDEX IF NOT EXISTS idx_user_activity_country
ON "user_activity_logs"(country);

CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp_userid
ON "user_activity_logs"(timestamp DESC, "userId");

-- ========================================
-- daily_user_stats Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_daily_stats_date
ON "daily_user_stats"(date DESC);

-- ========================================
-- hourly_activity_stats Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_hourly_stats_hour
ON "hourly_activity_stats"(hour DESC);

-- ========================================
-- feature_usage_stats Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_feature_stats_date
ON "feature_usage_stats"(date DESC);

CREATE INDEX IF NOT EXISTS idx_feature_stats_name
ON "feature_usage_stats"("featureName");

CREATE INDEX IF NOT EXISTS idx_feature_stats_date_name
ON "feature_usage_stats"(date DESC, "featureName");

-- ========================================
-- subscription_change_logs Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_subscription_log_timestamp
ON "subscription_change_logs"(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_log_userid
ON "subscription_change_logs"("userId");

CREATE INDEX IF NOT EXISTS idx_subscription_log_changetype
ON "subscription_change_logs"("changeType");

-- ========================================
-- audit_logs Indexes (for error queries)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
ON "audit_logs"(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_severity
ON "audit_logs"(severity);

-- ========================================
-- app_logs Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_app_log_timestamp
ON "app_logs"(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_app_log_level
ON "app_logs"(level);

CREATE INDEX IF NOT EXISTS idx_app_log_category
ON "app_logs"(category);

CREATE INDEX IF NOT EXISTS idx_app_log_timestamp_level
ON "app_logs"(timestamp DESC, level);

-- ========================================
-- users Table Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_created_at
ON "users"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_user_ispaid
ON "users"("isPaid");

-- ========================================
-- Verification and Statistics
-- ========================================

-- Analyze tables to update statistics for query planner
ANALYZE "user_activity_logs";
ANALYZE "daily_user_stats";
ANALYZE "hourly_activity_stats";
ANALYZE "feature_usage_stats";
ANALYZE "subscription_change_logs";
ANALYZE "app_logs";
ANALYZE "users";

-- Show created indexes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    tablename LIKE '%activity%' OR
    tablename LIKE '%stats%' OR
    tablename = 'users' OR
    tablename LIKE '%log%' OR
    tablename LIKE '%subscription%'
  )
ORDER BY tablename, indexname;

-- Show table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
    pg_size_pretty(pg_total_relation_size(tablename::regclass) - pg_relation_size(tablename::regclass)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    tablename LIKE '%activity%' OR
    tablename LIKE '%stats%' OR
    tablename = 'users' OR
    tablename LIKE '%log%' OR
    tablename LIKE '%subscription%'
  )
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
