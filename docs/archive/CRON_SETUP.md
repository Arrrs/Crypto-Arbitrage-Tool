# Self-Hosted Cron Jobs Setup

This application uses **node-cron** for self-hosted scheduled tasks. Cron jobs run in-process with your Next.js application.

## How It Works

1. **Auto-initialization**: When your Next.js server starts, `instrumentation.ts` automatically initializes all enabled cron jobs
2. **In-process execution**: Jobs run within your Node.js process (no external service needed)
3. **Database-driven**: Job schedules are stored in the database and can be managed via the admin UI
4. **Real-time updates**: Enable/disable jobs or change schedules through the UI at `/admin/cron`

## Available Cron Jobs

### 1. Log Cleanup (`log_cleanup`)
- **Schedule**: `0 2 * * *` (2:00 AM daily)
- **Purpose**: Deletes old logs based on retention policy
- **Configurable at**: `/admin/settings` → Log Retention Policy

### 2. System Health Check (`system_health_check`)
- **Schedule**: `*/15 * * * *` (Every 15 minutes)
- **Purpose**: Monitors system health and triggers alerts if issues detected
- **Checks**: Database connectivity, memory usage, error rates

### 3. Analytics Refresh (`analytics_refresh`)
- **Schedule**: `0 */6 * * *` (Every 6 hours)
- **Purpose**: Pre-calculates analytics data for dashboard performance
- **Output**: Cached statistics for faster page loads

## Managing Cron Jobs

### Via Admin UI

1. Navigate to `/admin/cron`
2. Toggle jobs on/off with the switch
3. Click "Edit" to change the schedule (cron expression)
4. Click "Run Now" to execute immediately
5. View execution history in the timeline

### Via Database

```sql
-- Enable/disable a job
UPDATE "CronJob" SET enabled = true WHERE name = 'log_cleanup';

-- Change schedule (use cron expression format)
UPDATE "CronJob" SET schedule = '0 3 * * *' WHERE name = 'log_cleanup';
```

## Cron Expression Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 both represent Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Examples

- `0 2 * * *` - Every day at 2:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Every Sunday at midnight
- `30 3 * * 1` - Every Monday at 3:30 AM

## Adding New Cron Jobs

### 1. Create the Job Handler

Edit `/lib/cron.ts` and add your new function:

```typescript
export async function myNewJob(): Promise<{
  success: boolean
  output?: string
  recordsAffected?: number
}> {
  return executeCronJob("my_new_job", async () => {
    // Your job logic here
    const result = await doSomething()

    return {
      success: true,
      output: `Processed ${result.count} items`,
      recordsAffected: result.count,
    }
  })
}
```

### 2. Register the Handler

Edit `/lib/cron-scheduler.ts` in the `getJobHandler` function:

```typescript
const handlers: Record<string, () => Promise<void>> = {
  // ... existing handlers
  my_new_job: async () => {
    const result = await myNewJob()
    console.log(`[Cron] My job completed: ${result.output}`)
  },
}
```

### 3. Add to Database

Run this in your database or add to `scripts/init-system.ts`:

```sql
INSERT INTO "CronJob" (id, name, description, schedule, enabled)
VALUES (
  'my-new-job-id',
  'my_new_job',
  'Description of what this job does',
  '0 1 * * *',  -- 1:00 AM daily
  true
);
```

### 4. Restart Your App

The new job will be automatically scheduled on next startup!

## Deployment Considerations

### Development
- Cron jobs run when you start `npm run dev`
- Logs appear in your terminal console

### Production (Self-Hosted)

**PM2** (recommended):
```bash
# Start with PM2 for auto-restart
pm2 start npm --name "nextauth-app" -- start

# View logs
pm2 logs nextauth-app

# Restart (will reinitialize cron jobs)
pm2 restart nextauth-app
```

**Docker**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
```

**Systemd**:
```ini
[Unit]
Description=NextAuth App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nextauth
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

### Production (Serverless)

⚠️ **Important**: node-cron does NOT work with serverless deployments (Vercel, Netlify, AWS Lambda) because:
- Serverless functions are stateless and ephemeral
- No persistent process to run scheduled tasks

**For Vercel**, use Vercel Cron instead:

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/log-cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Then create API routes that call your cron functions.

## Monitoring

### Check Job Status

Visit `/admin/cron` to see:
- ✅ Last run time
- ⏰ Next scheduled run
- 📊 Success/failure count
- 📝 Recent execution logs

### Execution History

Each job execution is logged with:
- Start and completion time
- Duration (ms)
- Status (SUCCESS/FAILURE/RUNNING)
- Output message
- Records affected

### Alerts

Configure alerts at `/admin/alerts` to be notified if:
- A cron job fails repeatedly
- A job takes too long to complete
- A job hasn't run in expected timeframe

## Troubleshooting

### Jobs Not Running

**Check if instrumentation is enabled:**
```typescript
// next.config.ts should have:
experimental: {
  instrumentationHook: true,
}
```

**Check console logs on startup:**
```
[Instrumentation] Initializing application services...
[Cron Scheduler] Initializing cron jobs...
[Cron Scheduler] Scheduled job: log_cleanup (0 2 * * *)
[Cron Scheduler] Initialized 3 cron jobs
```

**Verify job is enabled in database:**
```sql
SELECT name, enabled, schedule FROM "CronJob";
```

### Job Failing

1. Check execution logs in `/admin/cron`
2. Look for errors in your server console
3. Test the job manually by clicking "Run Now"
4. Check if the job handler exists in `cron-scheduler.ts`

### Invalid Cron Expression

Use an online validator like [crontab.guru](https://crontab.guru/) to verify your expression.

Common mistakes:
- ❌ `0 0 0 * * *` (6 fields - only use 5)
- ✅ `0 0 * * *` (5 fields - correct)

## Performance Tips

1. **Avoid overlapping executions**: Ensure jobs complete before next scheduled run
2. **Use batch processing**: Process large datasets in chunks with delays
3. **Set reasonable timeouts**: Long-running jobs can block the event loop
4. **Monitor memory**: Heavy jobs can cause memory leaks if not cleaned up properly

## Security

- Cron endpoints are protected by admin authentication
- Only ADMIN role can enable/disable jobs or change schedules
- All changes are logged in audit logs
- Failed jobs trigger security alerts if configured
