-- CreateTable
CREATE TABLE "analytics_settings" (
    "id" TEXT NOT NULL DEFAULT 'analytics_config',
    "trackPageViews" BOOLEAN NOT NULL DEFAULT true,
    "trackUserActivity" BOOLEAN NOT NULL DEFAULT true,
    "trackDeviceInfo" BOOLEAN NOT NULL DEFAULT true,
    "trackGeolocation" BOOLEAN NOT NULL DEFAULT true,
    "trackSubscriptionEvents" BOOLEAN NOT NULL DEFAULT true,
    "trackPerformance" BOOLEAN NOT NULL DEFAULT false,
    "samplingRate" INTEGER NOT NULL DEFAULT 100,
    "batchSize" INTEGER NOT NULL DEFAULT 100,
    "asyncTracking" BOOLEAN NOT NULL DEFAULT true,
    "retainRawData" INTEGER NOT NULL DEFAULT 90,
    "retainAggregatedData" INTEGER NOT NULL DEFAULT 365,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "analytics_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "resource" TEXT,
    "action" TEXT,
    "metadata" JSONB,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "ipAddress" TEXT,
    "country" TEXT,
    "city" TEXT,
    "duration" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_change_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "fromPlan" TEXT,
    "toPlan" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_user_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "paidUsers" INTEGER NOT NULL DEFAULT 0,
    "freeUsers" INTEGER NOT NULL DEFAULT 0,
    "totalLogins" INTEGER NOT NULL DEFAULT 0,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "totalPageViews" INTEGER NOT NULL DEFAULT 0,
    "mobileUsers" INTEGER NOT NULL DEFAULT 0,
    "desktopUsers" INTEGER NOT NULL DEFAULT 0,
    "tabletUsers" INTEGER NOT NULL DEFAULT 0,
    "topCountries" JSONB,
    "revenue" DECIMAL(10,2),
    "newSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "cancelledSubscriptions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hourly_activity_stats" (
    "id" TEXT NOT NULL,
    "hour" TIMESTAMP NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "logins" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" INTEGER,
    "errorRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hourly_activity_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_usage_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "featureName" TEXT NOT NULL,
    "totalUses" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "freeUserUses" INTEGER NOT NULL DEFAULT 0,
    "paidUserUses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_usage_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_activity_logs_userId_timestamp_idx" ON "user_activity_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "user_activity_logs_activity_timestamp_idx" ON "user_activity_logs"("activity", "timestamp");

-- CreateIndex
CREATE INDEX "user_activity_logs_timestamp_idx" ON "user_activity_logs"("timestamp");

-- CreateIndex
CREATE INDEX "user_activity_logs_deviceType_idx" ON "user_activity_logs"("deviceType");

-- CreateIndex
CREATE INDEX "user_activity_logs_country_idx" ON "user_activity_logs"("country");

-- CreateIndex
CREATE INDEX "subscription_change_logs_userId_idx" ON "subscription_change_logs"("userId");

-- CreateIndex
CREATE INDEX "subscription_change_logs_changeType_idx" ON "subscription_change_logs"("changeType");

-- CreateIndex
CREATE INDEX "subscription_change_logs_timestamp_idx" ON "subscription_change_logs"("timestamp");

-- CreateIndex
CREATE INDEX "subscription_change_logs_toStatus_idx" ON "subscription_change_logs"("toStatus");

-- CreateIndex
CREATE INDEX "daily_user_stats_date_idx" ON "daily_user_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_user_stats_date_key" ON "daily_user_stats"("date");

-- CreateIndex
CREATE INDEX "hourly_activity_stats_hour_idx" ON "hourly_activity_stats"("hour");

-- CreateIndex
CREATE UNIQUE INDEX "hourly_activity_stats_hour_key" ON "hourly_activity_stats"("hour");

-- CreateIndex
CREATE INDEX "feature_usage_stats_date_idx" ON "feature_usage_stats"("date");

-- CreateIndex
CREATE INDEX "feature_usage_stats_featureName_idx" ON "feature_usage_stats"("featureName");

-- CreateIndex
CREATE UNIQUE INDEX "feature_usage_stats_date_featureName_key" ON "feature_usage_stats"("date", "featureName");

-- AddForeignKey
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_change_logs" ADD CONSTRAINT "subscription_change_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
