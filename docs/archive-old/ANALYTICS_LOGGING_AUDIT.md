# Analytics & Logging System Audit

**Date**: October 27, 2025
**Purpose**: Verify logging system is ready for Metabase dashboards and analytics

---

## Current Logging Infrastructure

### ✅ What We Have (Well Implemented)

#### 1. Database Tables for Logging

**AppLog** - General application errors and events
```prisma
model AppLog {
  id        String   @id @default(cuid())
  level     LogLevel // INFO, WARN, ERROR, DEBUG
  message   String   @db.Text
  category  String   // "auth", "api", "2fa", "email", etc.
  metadata  Json?    // requestId, userId, error details
  stack     String?  @db.Text
  timestamp DateTime @default(now())

  @@index([level])
  @@index([category])
  @@index([timestamp])
}
```

**SessionLog** - User login/logout activity
```prisma
model SessionLog {
  id         String   @id
  userId     String
  event      String   // "LOGIN", "LOGOUT", "SESSION_REFRESH"
  method     String?  // "credentials", "google", "2fa"
  ipAddress  String?
  userAgent  String?
  country    String?
  city       String?
  success    Boolean
  failReason String?
  timestamp  DateTime

  @@index([userId])
  @@index([event])
  @@index([timestamp])
  @@index([success])
}
```

**AuditLog** - Admin actions
```prisma
model AuditLog {
  id         String   @id
  adminId    String
  action     String   // "CREATE_USER", "DELETE_USER", etc.
  severity   AuditSeverity
  resource   String?
  resourceId String?
  details    Json?
  ipAddress  String?
  userAgent  String?
  country    String?
  city       String?
  timestamp  DateTime

  @@index([adminId])
  @@index([action])
  @@index([timestamp])
  @@index([severity])
}
```

**RateLimitLog** - API rate limiting
```prisma
model RateLimitLog {
  id         String   @id
  userId     String?
  identifier String   // IP or user ID
  endpoint   String
  attempts   Int
  blocked    Boolean
  windowStart DateTime
  windowEnd   DateTime
  timestamp   DateTime

  @@index([identifier, endpoint])
  @@index([windowEnd])
}
```

#### 2. Structured Logger
- ✅ Request ID tracking
- ✅ Category-based filtering
- ✅ JSON metadata storage
- ✅ User ID tracking
- ✅ Error stack traces
- ✅ Database persistence

---

## ❌ What's Missing for Full Analytics

### 1. **User Activity Tracking is INCOMPLETE**

**Currently Missing**:
- ❌ Page views / route visits
- ❌ Feature usage tracking (which features users actually use)
- ❌ User journey tracking (signup → verification → first login)
- ❌ Device type (mobile/desktop/tablet)
- ❌ Browser information
- ❌ Session duration
- ❌ Active users tracking (DAU/MAU/WAU)

**What We Track Now**:
- ✅ Login/logout events
- ✅ Failed login attempts
- ⚠️ IP geolocation (country, city)

### 2. **Subscription/Payment Analytics Missing**

**Not Tracked**:
- ❌ Subscription changes (free → paid, paid → cancelled)
- ❌ Payment attempts/failures
- ❌ Trial conversions
- ❌ Churn rate data
- ❌ Revenue per user

**Current State**:
- User model has `isPaid` and `paidUntil` fields
- But no historical tracking of changes

### 3. **User Lifecycle Events Missing**

**Not Logged**:
- ❌ User registration (first signup timestamp exists but not logged)
- ❌ Email verification completion
- ❌ Password resets (attempted vs completed)
- ❌ 2FA enablement/disablement
- ❌ Profile updates
- ❌ Avatar uploads
- ❌ Account deletions

### 4. **Performance Metrics Missing**

**Not Tracked**:
- ❌ API response times
- ❌ Database query performance
- ❌ Page load times
- ❌ Error rates per endpoint

### 5. **Business Metrics Missing**

**Not Tracked**:
- ❌ User activation rate (% who complete key actions)
- ❌ Feature adoption rates
- ❌ User retention cohorts
- ❌ Funnel conversions

---

## 🎯 Recommendations for Your Metabase Dashboards

### Priority 1: User Activity Analytics (CRITICAL)

#### A. Create UserActivityLog Table

```prisma
model UserActivityLog {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // What happened
  activity     String   // "PAGE_VIEW", "FEATURE_USE", "SIGNUP", "VERIFICATION", etc.
  resource     String?  // Page path, feature name, etc.
  action       String?  // "CLICK", "SUBMIT", "VIEW", etc.

  // Context
  metadata     Json?    // Additional context

  // Device/Browser
  userAgent    String?
  deviceType   String?  // "mobile", "desktop", "tablet"
  browser      String?  // "Chrome", "Firefox", etc.
  os           String?  // "Windows", "macOS", "iOS", "Android"

  // Location
  ipAddress    String?
  country      String?
  city         String?

  // Timing
  duration     Int?     // For timed events (milliseconds)
  timestamp    DateTime @default(now())

  @@index([userId])
  @@index([activity])
  @@index([timestamp])
  @@index([deviceType])
  @@index([country])
  @@index([userId, timestamp])
  @@map("user_activity_logs")
}
```

#### B. Add Session Duration Tracking

Update `SessionLog` to include:
```prisma
model SessionLog {
  // ... existing fields ...
  sessionStart  DateTime  @default(now())
  sessionEnd    DateTime?
  duration      Int?      // seconds
  pagesVisited  Int?      // count of pages viewed
}
```

### Priority 2: Subscription Analytics

#### Create SubscriptionChangeLog Table

```prisma
model SubscriptionChangeLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // What changed
  changeType    String   // "UPGRADE", "DOWNGRADE", "CANCEL", "RENEW", "TRIAL_START", "TRIAL_END"
  fromStatus    String?  // Previous status
  toStatus      String   // New status
  fromPlan      String?  // Previous plan
  toPlan        String?  // New plan

  // Payment info
  amount        Decimal? @db.Decimal(10, 2)
  currency      String?  @default("USD")
  paymentMethod String?

  // Metadata
  reason        String?  // Reason for change (user-provided or system)
  metadata      Json?

  timestamp     DateTime @default(now())

  @@index([userId])
  @@index([changeType])
  @@index([timestamp])
  @@index([toStatus])
  @@map("subscription_change_logs")
}
```

### Priority 3: User Lifecycle Events

#### Add to AppLog with Specific Categories

Use existing `AppLog` but ensure we log:
- Category: `user_lifecycle` with events:
  - `USER_REGISTERED`
  - `EMAIL_VERIFIED`
  - `PASSWORD_RESET`
  - `2FA_ENABLED`
  - `2FA_DISABLED`
  - `PROFILE_UPDATED`
  - `AVATAR_UPLOADED`
  - `ACCOUNT_DELETED`

**Metadata should include**:
```json
{
  "userId": "user_id",
  "userEmail": "email",
  "registrationMethod": "credentials" | "google",
  "deviceType": "mobile" | "desktop",
  "country": "US",
  "requestId": "uuid"
}
```

---

## 📊 SQL Query Examples for Metabase

### Dashboard 1: User Growth

```sql
-- Daily new users
SELECT
  DATE("createdAt") as date,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE("createdAt")) as total_users
FROM "User"
GROUP BY DATE("createdAt")
ORDER BY date DESC;

-- New users by registration method
SELECT
  CASE
    WHEN "password" IS NOT NULL THEN 'Email/Password'
    ELSE 'OAuth (Google)'
  END as method,
  COUNT(*) as count
FROM "User"
WHERE "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY method;
```

### Dashboard 2: Login Activity

```sql
-- Daily active users (DAU)
SELECT
  DATE(timestamp) as date,
  COUNT(DISTINCT "userId") as active_users
FROM "SessionLog"
WHERE event = 'LOGIN'
  AND success = true
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Login success rate
SELECT
  DATE(timestamp) as date,
  COUNT(*) FILTER (WHERE success = true) as successful_logins,
  COUNT(*) FILTER (WHERE success = false) as failed_logins,
  ROUND(
    COUNT(*) FILTER (WHERE success = true)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate_percent
FROM "SessionLog"
WHERE event = 'LOGIN'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Logins by device/location (when we add this)
SELECT
  country,
  "deviceType",
  COUNT(*) as login_count
FROM "SessionLog"
WHERE event = 'LOGIN'
  AND success = true
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY country, "deviceType"
ORDER BY login_count DESC;
```

### Dashboard 3: Paid vs Free Users

```sql
-- Current breakdown
SELECT
  CASE
    WHEN "isPaid" = true AND "paidUntil" > NOW() THEN 'Paid (Active)'
    WHEN "isPaid" = true AND "paidUntil" <= NOW() THEN 'Paid (Expired)'
    ELSE 'Free'
  END as status,
  COUNT(*) as user_count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM "User") * 100, 2) as percentage
FROM "User"
GROUP BY status;

-- Revenue trend (requires SubscriptionChangeLog)
SELECT
  DATE_TRUNC('month', timestamp) as month,
  SUM(amount) as revenue,
  COUNT(DISTINCT "userId") as paying_users
FROM "SubscriptionChangeLog"
WHERE "changeType" IN ('UPGRADE', 'RENEW')
  AND timestamp >= NOW() - INTERVAL '12 months'
GROUP BY month
ORDER BY month DESC;
```

### Dashboard 4: Error Monitoring

```sql
-- Errors by category (last 24 hours)
SELECT
  category,
  COUNT(*) as error_count,
  ARRAY_AGG(DISTINCT message) as error_types
FROM "AppLog"
WHERE level = 'ERROR'
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY category
ORDER BY error_count DESC;

-- Error trend
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  category,
  COUNT(*) as errors
FROM "AppLog"
WHERE level = 'ERROR'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY hour, category
ORDER BY hour DESC, errors DESC;

-- Failed requests by endpoint (requires enhanced logging)
SELECT
  metadata->>'endpoint' as endpoint,
  COUNT(*) as failures,
  ARRAY_AGG(DISTINCT message) as error_types
FROM "AppLog"
WHERE level = 'ERROR'
  AND category = 'api'
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY failures DESC;
```

### Dashboard 5: User Engagement

```sql
-- Active users (DAU, WAU, MAU)
WITH daily_active AS (
  SELECT DATE(timestamp) as date, "userId"
  FROM "SessionLog"
  WHERE event = 'LOGIN' AND success = true
  GROUP BY date, "userId"
)
SELECT
  (SELECT COUNT(DISTINCT "userId") FROM daily_active WHERE date = CURRENT_DATE) as dau,
  (SELECT COUNT(DISTINCT "userId") FROM daily_active WHERE date >= CURRENT_DATE - 7) as wau,
  (SELECT COUNT(DISTINCT "userId") FROM daily_active WHERE date >= CURRENT_DATE - 30) as mau;

-- User retention cohort (simplified)
WITH cohorts AS (
  SELECT
    DATE_TRUNC('month', "createdAt") as cohort_month,
    id as user_id
  FROM "User"
)
SELECT
  c.cohort_month,
  COUNT(DISTINCT c.user_id) as cohort_size,
  COUNT(DISTINCT s."userId") FILTER (
    WHERE DATE_TRUNC('month', s.timestamp) = c.cohort_month + INTERVAL '1 month'
  ) as month_1_retained
FROM cohorts c
LEFT JOIN "SessionLog" s ON c.user_id = s."userId" AND s.event = 'LOGIN'
GROUP BY c.cohort_month
ORDER BY c.cohort_month DESC;
```

---

## 🔧 Implementation Steps

### Step 1: Add Missing Tables (High Priority)

1. **UserActivityLog** - For page views, feature usage
2. **SubscriptionChangeLog** - For payment analytics

### Step 2: Enhance Existing Logging

1. **Add device detection** to SessionLog:
   - Parse userAgent to extract device type, browser, OS
   - Store in dedicated fields for easy querying

2. **Add lifecycle events** to AppLog:
   - Log user registration
   - Log email verification
   - Log 2FA changes
   - Log profile updates

3. **Add request tracking** to AppLog:
   - Log API endpoint in metadata
   - Log response time (add duration field)

### Step 3: Create Helper Functions

```typescript
// lib/analytics.ts
export async function trackActivity(params: {
  userId: string
  activity: string
  resource?: string
  deviceType?: string
  metadata?: Record<string, any>
}) {
  await prisma.userActivityLog.create({
    data: {
      userId: params.userId,
      activity: params.activity,
      resource: params.resource,
      deviceType: params.deviceType,
      metadata: params.metadata,
      timestamp: new Date(),
    },
  })
}

// Usage in routes
await trackActivity({
  userId: session.user.id,
  activity: "PAGE_VIEW",
  resource: "/dashboard",
  deviceType: getDeviceType(request),
})
```

### Step 4: Update Existing Routes

Add tracking to:
- User registration (`/api/auth/register`)
- Login success (`/api/auth/signin`)
- Email verification (`/api/auth/verify-email`)
- 2FA setup/disable (`/api/user/2fa/*`)
- Profile updates (`/api/user/profile`)
- Subscription changes (when implemented)

---

## 📈 Metabase Dashboard Ideas

### Dashboard 1: **Overview** (Home Dashboard)
- Total users (Free vs Paid)
- Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- New signups today/this week/this month
- Revenue this month
- Error rate (last 24h)
- Failed login attempts (last 24h)

### Dashboard 2: **User Growth**
- New users over time (line chart)
- Registration method breakdown (pie chart)
- User growth rate (% change week-over-week)
- Email verification rate
- User retention cohort table

### Dashboard 3: **User Activity**
- DAU/WAU/MAU trend
- Logins by day of week / hour of day (heatmap)
- Top countries by user count
- Device type distribution (mobile vs desktop)
- Browser distribution

### Dashboard 4: **Revenue & Subscriptions**
- MRR (Monthly Recurring Revenue)
- Paid vs Free users trend
- Conversion rate (Free → Paid)
- Churn rate
- Average revenue per user (ARPU)
- Trial-to-paid conversion

### Dashboard 5: **Security & Errors**
- Failed login attempts over time
- Error count by category
- Rate limit violations
- 2FA adoption rate
- Suspicious login locations

### Dashboard 6: **Feature Usage**
- Most visited pages
- Feature adoption (% users who used feature X)
- Feature usage frequency
- User journey funnels

---

## ✅ What to Implement NOW

Based on your needs, I recommend implementing in this order:

### Immediate (Before Metabase Setup)
1. ✅ **Keep current structured logging** - Already done!
2. ⏳ **Add device detection** - Parse userAgent in SessionLog
3. ⏳ **Add UserActivityLog table** - For page views and feature usage
4. ⏳ **Add lifecycle event logging** - Track key user actions

### Short-term (With Metabase)
1. ⏳ **Create SubscriptionChangeLog** - When you implement payments
2. ⏳ **Add SQL query templates** - Ready-to-use for common dashboards
3. ⏳ **Set up Metabase container** - Docker Compose with Postgres connection

### Medium-term (After MVP)
1. Performance monitoring (API response times)
2. Advanced user segmentation
3. A/B testing event tracking
4. Custom event tracking

---

## 🐳 Docker Compose for Metabase

```yaml
services:
  metabase:
    image: metabase/metabase:latest
    container_name: metabase
    ports:
      - "3001:3000"
    environment:
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: metabase
      MB_DB_PORT: 5432
      MB_DB_USER: postgres
      MB_DB_PASS: password
      MB_DB_HOST: postgres
    depends_on:
      - postgres
    volumes:
      - metabase-data:/metabase-data
    networks:
      - app-network

volumes:
  metabase-data:
```

Then connect Metabase to your main PostgreSQL database to query `User`, `SessionLog`, `AppLog`, etc.

---

## 🎯 Summary

**Current State**:
- ✅ Error logging: **EXCELLENT** (100% complete)
- ✅ Security logging: **GOOD** (SessionLog, AuditLog)
- ⚠️ User analytics: **INCOMPLETE** (no activity tracking, no device info)
- ❌ Business metrics: **MISSING** (no subscription tracking)

**To Make This Perfect for Metabase**:
1. Add `UserActivityLog` table
2. Add device/browser parsing to SessionLog
3. Add lifecycle event logging
4. Add `SubscriptionChangeLog` table (later)
5. Create SQL query templates for common dashboards

**Current Capability**: You can build dashboards for error monitoring and basic user count, but NOT for detailed user behavior, engagement, or business metrics.

Want me to implement the missing pieces now?

