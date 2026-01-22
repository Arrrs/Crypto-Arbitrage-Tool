# Metabase Quick Setup Guide

## 1. Add Metabase URL to Environment

Create or edit `.env.local` file in project root:

```bash
# Metabase Analytics Dashboard URL
NEXT_PUBLIC_METABASE_URL=http://localhost:3001
```

**For production:**
```bash
NEXT_PUBLIC_METABASE_URL=https://metabase.yourdomain.com
```

## 2. Restart Next.js Dev Server

After adding the environment variable:

```bash
# Stop current server (Ctrl+C)
# Restart
npm run dev
```

## 3. Test the Integration

1. Navigate to: http://localhost:3000/admin/analytics
2. Click "Open Metabase Dashboard" button
3. Should open Metabase in new tab

## 4. Default Behavior

If `NEXT_PUBLIC_METABASE_URL` is not set:
- Falls back to `http://localhost:3001`
- Works for local development

## 5. Metabase Installation (if not installed)

### Option A: Docker (Recommended)

```bash
docker run -d -p 3001:3000 --name metabase metabase/metabase
```

Access at: http://localhost:3001

### Option B: Docker Compose

Add to your `docker-compose.yml`:

```yaml
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
```

Then:
```bash
docker-compose up -d metabase
```

### Option C: Java JAR

```bash
# Download
wget https://downloads.metabase.com/latest/metabase.jar

# Run
java -jar metabase.jar
```

Access at: http://localhost:3000 (change to 3001 if needed)

## 6. Initial Metabase Configuration

### First-time Setup:
1. Open Metabase (http://localhost:3001)
2. Create admin account
3. Connect to your PostgreSQL database:
   - **Database type:** PostgreSQL
   - **Host:** localhost (or postgres if using Docker)
   - **Port:** 5432
   - **Database name:** webapp_dev1 (your database name)
   - **Username:** postgres
   - **Password:** password

### Import Queries:
1. Go to SQL Editor in Metabase
2. Copy queries from `/metabase/queries/` directory
3. Save each as a saved question
4. Create dashboards using saved questions

## 7. Available SQL Queries

Located in `/metabase/queries/` with 6 categories:

1. **Users** (5 queries)
   - User growth over time
   - Paid vs free users
   - User retention
   - New signups
   - Churn rate

2. **Devices** (3 queries)
   - Mobile vs desktop
   - Browser distribution
   - OS breakdown

3. **Engagement** (4 queries)
   - Active users DAU/WAU/MAU
   - Session duration
   - Feature usage
   - User engagement score

4. **Geographic** (2 queries)
   - Users by country
   - Users by city

5. **Subscriptions** (2 queries)
   - Revenue trends
   - Conversion funnel

6. **Activity** (1 query)
   - Hourly activity patterns

## 8. Quick Verification

**Test the connection:**
1. Go to http://localhost:3000/admin/analytics
2. You should see real data:
   - Total Users: (actual count)
   - Paid Users: (actual count)
   - Active Users: (actual count)
3. Click "Open Metabase Dashboard"
4. New tab opens with Metabase

**If you see zeros:**
- Run test data generator: `npx tsx scripts/generate-test-analytics-data.ts`
- Check analytics tracking is enabled in Settings
- Verify database connection

## 9. Troubleshooting

### Button doesn't open Metabase
- Check `.env.local` has `NEXT_PUBLIC_METABASE_URL`
- Restart Next.js dev server
- Check browser console for errors

### Metabase not accessible
- Verify Metabase is running: `docker ps | grep metabase`
- Check port 3001 is available: `lsof -i:3001`
- Try accessing directly: http://localhost:3001

### No data in Metabase queries
- Confirm database connection in Metabase
- Run migrations: `npx prisma migrate dev`
- Generate test data: `npx tsx scripts/generate-test-analytics-data.ts`
- Check table names (use snake_case: `user_activity_logs` not `UserActivityLog`)

### Stats show zero
- Check analytics tracking is enabled: `/admin/settings` → Analytics Settings
- Verify tracking functions are being called
- Check `user_activity_logs` table has data: `SELECT COUNT(*) FROM user_activity_logs;`

## 10. Production Deployment

### Environment Variables:
```bash
# Production .env
NEXT_PUBLIC_METABASE_URL=https://metabase.yourdomain.com
```

### Metabase Cloud (Recommended):
- Sign up at: https://www.metabase.com/start/
- Or use Metabase Cloud Pro
- Connect to your production database
- Update `NEXT_PUBLIC_METABASE_URL`

### Self-hosted:
- Deploy Metabase on your server
- Use HTTPS with SSL certificate
- Configure authentication (SSO, LDAP, etc.)
- Restrict access to admin users

## Summary

**Quick start:**
1. Add `NEXT_PUBLIC_METABASE_URL=http://localhost:3001` to `.env.local`
2. Restart Next.js dev server
3. Run Metabase: `docker run -d -p 3001:3000 metabase/metabase`
4. Visit http://localhost:3000/admin/analytics
5. Click "Open Metabase Dashboard"

Done! 🎉
