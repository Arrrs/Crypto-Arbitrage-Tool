-- Analytics Database Indexes for Metabase Performance
-- Run this after creating the analytics tables to improve query performance

-- ========================================
-- UserActivityLog Indexes
-- ========================================

-- Primary timestamp index (most queries filter by time)
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp
ON "UserActivityLog"(timestamp DESC);

-- User ID index (for user-specific queries)
CREATE INDEX IF NOT EXISTS idx_user_activity_userid
ON "UserActivityLog"("userId");

-- Activity type index (for filtering by activity type)
CREATE INDEX IF NOT EXISTS idx_user_activity_activity
ON "UserActivityLog"(activity);

-- Resource index (for feature tracking)
CREATE INDEX IF NOT EXISTS idx_user_activity_resource
ON "UserActivityLog"(resource);

-- Device type index (for device distribution queries)
CREATE INDEX IF NOT EXISTS idx_user_activity_device
ON "UserActivityLog"("deviceType");

-- Country index (for geographic queries)
CREATE INDEX IF NOT EXISTS idx_user_activity_country
ON "UserActivityLog"(country);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp_userid
ON "UserActivityLog"(timestamp DESC, "userId");

-- ========================================
-- DailyUserStats Indexes
-- ========================================

-- Date index (primary filter in most queries)
CREATE INDEX IF NOT EXISTS idx_daily_stats_date
ON "DailyUserStats"(date DESC);

-- ========================================
-- HourlyActivityStats Indexes
-- ========================================

-- Hour index (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_hourly_stats_hour
ON "HourlyActivityStats"(hour DESC);

-- ========================================
-- FeatureUsageStats Indexes
-- ========================================

-- Date index
CREATE INDEX IF NOT EXISTS idx_feature_stats_date
ON "FeatureUsageStats"(date DESC);

-- Feature name index
CREATE INDEX IF NOT EXISTS idx_feature_stats_name
ON "FeatureUsageStats"("featureName");

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_feature_stats_date_name
ON "FeatureUsageStats"(date DESC, "featureName");

-- ========================================
-- SubscriptionChangeLog Indexes
-- ========================================

-- Timestamp index
CREATE INDEX IF NOT EXISTS idx_subscription_log_timestamp
ON "SubscriptionChangeLog"(timestamp DESC);

-- User ID index
CREATE INDEX IF NOT EXISTS idx_subscription_log_userid
ON "SubscriptionChangeLog"("userId");

-- Change type index
CREATE INDEX IF NOT EXISTS idx_subscription_log_changetype
ON "SubscriptionChangeLog"("changeType");

-- ========================================
-- AppLog Indexes (for error queries)
-- ========================================

-- Timestamp index
CREATE INDEX IF NOT EXISTS idx_app_log_timestamp
ON "AppLog"(timestamp DESC);

-- Level index (for filtering by ERROR, WARN, etc.)
CREATE INDEX IF NOT EXISTS idx_app_log_level
ON "AppLog"(level);

-- Category index
CREATE INDEX IF NOT EXISTS idx_app_log_category
ON "AppLog"(category);

-- Composite index for error queries
CREATE INDEX IF NOT EXISTS idx_app_log_timestamp_level
ON "AppLog"(timestamp DESC, level);

-- ========================================
-- User Table Indexes (if not already present)
-- ========================================

-- Created at index (for signup queries)
CREATE INDEX IF NOT EXISTS idx_user_created_at
ON "User"(created_at DESC);

-- isPaid index (for paid vs free queries)
CREATE INDEX IF NOT EXISTS idx_user_ispaid
ON "User"("isPaid");

-- ========================================
-- Verification and Statistics
-- ========================================

-- Check index sizes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename LIKE '%Activity%' OR
    tablename LIKE '%Stats%' OR
    tablename = 'User' OR
    tablename = 'AppLog' OR
    tablename LIKE '%Subscription%'
  )
ORDER BY tablename, indexname;

-- Analyze tables to update statistics for query planner
ANALYZE "UserActivityLog";
ANALYZE "DailyUserStats";
ANALYZE "HourlyActivityStats";
ANALYZE "FeatureUsageStats";
ANALYZE "SubscriptionChangeLog";
ANALYZE "AppLog";
ANALYZE "User";

-- Show table sizes for reference
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
    pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
    pg_size_pretty(pg_total_relation_size(tablename::regclass) - pg_relation_size(tablename::regclass)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND (
    tablename LIKE '%Activity%' OR
    tablename LIKE '%Stats%' OR
    tablename = 'User' OR
    tablename = 'AppLog' OR
    tablename LIKE '%Subscription%'
  )
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
