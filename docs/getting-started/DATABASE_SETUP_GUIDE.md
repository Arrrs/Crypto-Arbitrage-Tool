# Database Setup Guide

**Complete guide for setting up the database from scratch**

This guide is useful when:
- Starting a new project from this template
- Recreating the database
- Setting up on a new server/environment

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Run Migrations](#run-migrations)
3. [Create Indexes](#create-indexes)
4. [Initialize Data](#initialize-data)
5. [Verify Setup](#verify-setup)
6. [Production Considerations](#production-considerations)

---

## Initial Setup

### 1. Environment Variables

Create `.env` file in project root:

```bash
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database_name

# Database URL for Prisma
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

# Auth.js configuration
AUTH_SECRET="generate-a-secure-random-string-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Generate AUTH_SECRET**:
```bash
openssl rand -base64 32
```

### 2. Start PostgreSQL

**Option A: Docker (Recommended)**
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=webapp_dev \
  -p 5432:5432 \
  postgres:latest
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb your_database_name

# Or via psql
psql -U postgres
CREATE DATABASE your_database_name;
\q
```

---

## Run Migrations

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Run Migrations

**For development (creates migration files)**:
```bash
npx prisma migrate dev
```

This will:
- Create all tables
- Apply schema changes
- Generate Prisma client
- Show migration summary

**For production (applies existing migrations)**:
```bash
npx prisma migrate deploy
```

### Step 4: Verify Tables Created

```bash
npx prisma studio
# Opens browser at http://localhost:5555
# Or check via psql:
```

```sql
-- List all tables
\dt

-- Should see:
-- User
-- Account
-- Session
-- VerificationToken
-- SystemSettings
-- AuditLog
-- SessionLog
-- AppLog
-- CronJob
-- CronExecution
-- Alert
-- AlertTrigger
-- AnalyticsSettings
-- UserActivityLog
-- SubscriptionChangeLog
-- DailyUserStats
-- HourlyActivityStats
-- FeatureUsageStats
```

---

## Create Indexes

**IMPORTANT**: Run this after migrations for optimal performance!

### Option 1: Via Docker (if using Docker PostgreSQL)

```bash
docker exec -i postgres psql -U postgres -d your_database_name < metabase/setup-indexes.sql
```

### Option 2: Via psql (if using local PostgreSQL)

```bash
psql -U postgres -d your_database_name -f metabase/setup-indexes.sql
```

### Option 3: Via any SQL client

Copy the contents of `metabase/setup-indexes.sql` and run in your SQL client (DBeaver, pgAdmin, etc.)

### What This Does

Creates **20+ performance indexes** on:
- UserActivityLog (timestamp, userId, activity, resource, device, country)
- DailyUserStats (date)
- HourlyActivityStats (hour)
- FeatureUsageStats (date, featureName)
- SubscriptionChangeLog (timestamp, userId, changeType)
- AppLog (timestamp, level, category)
- User (created_at, isPaid)

**Performance Impact**: 10-100x faster queries in Metabase!

---

## Initialize Data

### Step 1: Initialize Analytics Cron Jobs

```bash
npx tsx scripts/init-analytics-crons.ts
```

**This creates**:
- 4 analytics cron jobs (daily stats, hourly stats, feature usage, cleanup)
- Default AnalyticsSettings (all tracking enabled)

**Output**:
```
✅ Created aggregate_daily_stats
✅ Created aggregate_hourly_stats
✅ Created aggregate_feature_usage
✅ Created cleanup_analytics_data
✅ Created default analytics settings
```

### Step 2: Create Default System Settings (Optional)

The app will auto-create default settings on first use, but you can pre-create them:

```sql
-- Default system settings
INSERT INTO "SystemSettings" (id, "createdAt", "updatedAt")
VALUES ('system_config', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Create First Admin User

**Option A: Via signup + manual promotion**
1. Run the app: `npm run dev`
2. Go to `http://localhost:3000/signup`
3. Create account with your email
4. Verify email (check MailHog at http://localhost:8025 in dev)
5. Promote to admin via database:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

**Option B: Direct database insert**
```sql
-- Generate password hash for "password123"
-- Use this online tool: https://bcrypt-generator.com/
-- Or in Node.js:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('password123', 12);

INSERT INTO "User" (
  id,
  email,
  name,
  password,
  role,
  "emailVerified",
  "adminVerified",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'admin@example.com',
  'Admin User',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYSiPjNw7U2', -- "password123"
  'ADMIN',
  NOW(),
  true,
  NOW(),
  NOW()
);
```

---

## Verify Setup

### Check 1: Tables Exist

```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
-- Should return 18+ tables
```

### Check 2: Indexes Created

```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('UserActivityLog', 'DailyUserStats', 'User')
ORDER BY tablename, indexname;
-- Should see multiple indexes per table
```

### Check 3: Cron Jobs Initialized

```sql
SELECT id, name, schedule, enabled
FROM "CronJob"
WHERE category = 'analytics';
-- Should return 4 rows
```

### Check 4: Analytics Settings Created

```sql
SELECT * FROM "AnalyticsSettings";
-- Should return 1 row with all tracking enabled
```

### Check 5: Admin User Exists

```sql
SELECT email, role, "emailVerified", "adminVerified"
FROM "User"
WHERE role = 'ADMIN';
-- Should show your admin user
```

---

## Production Considerations

### 1. Database Connection Pooling

For production, use connection pooling:

```env
# .env.production
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&connection_limit=10&pool_timeout=20"
```

Or use PgBouncer/Prisma Data Proxy.

### 2. Backup Strategy

**Automated backups**:
```bash
# Daily backup cron
0 2 * * * docker exec postgres pg_dump -U postgres your_db > /backups/db_$(date +\%Y\%m\%d).sql
```

**Manual backup**:
```bash
# Backup
docker exec postgres pg_dump -U postgres your_db > backup.sql

# Restore
docker exec -i postgres psql -U postgres your_db < backup.sql
```

### 3. Index Maintenance

Run monthly:
```sql
-- Reindex for optimal performance
REINDEX DATABASE your_database_name;

-- Update statistics
ANALYZE;

-- Vacuum to reclaim space
VACUUM;
```

### 4. Monitoring

**Check database size**:
```sql
SELECT
  pg_size_pretty(pg_database_size(current_database())) as total_size;
```

**Check largest tables**:
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

**Check index usage**:
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 10;
-- Indexes with 0 scans might be unnecessary
```

### 5. Security Checklist

- [ ] Change default passwords
- [ ] Generate secure AUTH_SECRET
- [ ] Use environment-specific database users
- [ ] Enable SSL for database connections in production
- [ ] Set up firewall rules (only allow app server access)
- [ ] Regular security updates for PostgreSQL
- [ ] Encrypt backups
- [ ] Use secrets manager for credentials (AWS Secrets Manager, etc.)

---

## Migration from Existing Project

If you have an existing database and want to add analytics:

### Step 1: Backup First!

```bash
docker exec postgres pg_dump -U postgres your_db > pre_analytics_backup.sql
```

### Step 2: Create Migration

```bash
npx prisma migrate dev --name add_analytics_system
```

### Step 3: Run Indexes

```bash
docker exec -i postgres psql -U postgres -d your_db < metabase/setup-indexes.sql
```

### Step 4: Initialize Cron Jobs

```bash
npx tsx scripts/init-analytics-crons.ts
```

---

## Troubleshooting

### Issue: "relation does not exist"

**Solution**: Run migrations
```bash
npx prisma migrate deploy
```

### Issue: Slow queries in Metabase

**Solution**: Run index creation script
```bash
docker exec -i postgres psql -U postgres -d your_db < metabase/setup-indexes.sql
```

### Issue: Can't connect to database

**Check**:
1. Database is running: `docker ps`
2. Port is correct: `5432`
3. Credentials match .env
4. Database exists: `docker exec postgres psql -U postgres -l`

### Issue: Migration conflicts

**Solution**: Reset (development only!)
```bash
npx prisma migrate reset
# This will DELETE ALL DATA and recreate from scratch
```

### Issue: Prisma Client out of sync

**Solution**: Regenerate
```bash
npx prisma generate
```

---

## Quick Reference

### Essential Commands

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (dev)
npx prisma migrate dev

# Run migrations (production)
npx prisma migrate deploy

# Create indexes (Docker)
docker exec -i postgres psql -U postgres -d your_db < metabase/setup-indexes.sql

# Initialize analytics
npx tsx scripts/init-analytics-crons.ts

# Open Prisma Studio
npx prisma studio

# View database
docker exec -it postgres psql -U postgres -d your_db
```

### Database Management

```bash
# Backup
docker exec postgres pg_dump -U postgres your_db > backup.sql

# Restore
docker exec -i postgres psql -U postgres your_db < backup.sql

# Check size
docker exec postgres psql -U postgres -d your_db -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# List tables
docker exec postgres psql -U postgres -d your_db -c "\dt"
```

---

## Checklist for New Project

- [ ] 1. Create .env with DATABASE_URL and AUTH_SECRET
- [ ] 2. Start PostgreSQL (Docker or local)
- [ ] 3. Run `npm install`
- [ ] 4. Run `npx prisma generate`
- [ ] 5. Run `npx prisma migrate deploy`
- [ ] 6. Run index creation script
- [ ] 7. Run `npx tsx scripts/init-analytics-crons.ts`
- [ ] 8. Create first admin user
- [ ] 9. Verify tables exist
- [ ] 10. Test app: `npm run dev`
- [ ] 11. Set up backups (production)
- [ ] 12. Configure monitoring (production)

---

**Date Created**: October 29, 2025
**Last Updated**: October 29, 2025
**Maintained By**: Project Documentation
