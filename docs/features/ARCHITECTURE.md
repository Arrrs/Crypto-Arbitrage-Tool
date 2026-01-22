# System Architecture Explanation

## 1. Settings Storage - Database vs .env

### Why Database Instead of .env?

**The Problem with .env:**
- ❌ Requires server restart to apply changes
- ❌ Cannot be modified through UI
- ❌ Not suitable for multi-instance deployments
- ❌ No history or audit trail
- ❌ Risk of exposing secrets in version control

**The Database Solution:**
```
Settings stored in database table: SystemSettings
├── key: unique identifier (e.g., "telegram_config")
├── value: JSON object with all related settings
├── description: human-readable description
├── updatedBy: admin who last modified it
└── updatedAt: timestamp of last change
```

### How It Works:

**1. Database Schema** (`/prisma/schema.prisma`):
```prisma
model SystemSettings {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json     // ✅ Flexible JSON storage
  description String?
  updatedBy   String?
  updatedAt   DateTime @updatedAt
}
```

**2. Example Data** (in database):
```json
{
  "key": "telegram_config",
  "value": {
    "botToken": "8470827303:...",
    "chatId": "321841339",
    "enabled": true
  },
  "description": "Telegram bot configuration for alerts"
}
```

**3. Reading Settings** (anywhere in code):
```typescript
const settings = await prisma.systemSettings.findUnique({
  where: { key: "telegram_config" }
})
const config = settings.value as { botToken: string, chatId: string, enabled: boolean }

// Use it
if (config.enabled) {
  await sendTelegramMessage(config, message)
}
```

**4. UI Changes are Instant:**
- Admin changes setting in `/admin/settings`
- Saved to database immediately
- Next alert check uses new value (no restart needed!)

### .env vs Database - When to Use What

**Use .env for:**
- ✅ Secrets that should NEVER change (encryption keys, API secrets)
- ✅ Environment-specific values (DATABASE_URL, NEXTAUTH_URL)
- ✅ Values that are the same across all instances
- ✅ Bootstrap configuration (app won't start without them)

**Use Database for:**
- ✅ User-configurable settings (Telegram config, retention policies)
- ✅ Feature flags that can be toggled
- ✅ Settings that vary by environment or over time
- ✅ Anything admins should be able to change via UI

**Current Setup:**
```env
# .env - Static, environment-specific
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Database - Dynamic, admin-configurable
telegram_config: { botToken, chatId, enabled }
log_retention: { auditLogs: 90, sessionLogs: 30, ... }
features: { geolocation: true, telegram_alerts: false, ... }
```

---

## 2. Cron Jobs Architecture

### Code Location Map:

```
Cron System Files:
├── /lib/cron.ts                    ← JOB HANDLERS (business logic)
├── /lib/cron-scheduler.ts          ← SCHEDULER (node-cron integration)
├── /instrumentation.ts             ← AUTO-INIT (runs on startup)
├── /app/api/admin/cron/route.ts    ← API (enable/disable/edit)
├── /app/admin/cron/page.tsx        ← UI (management interface)
└── Database: CronJob table         ← CONFIG (schedules, enabled status)
```

### How Cron Jobs Work:

**Step 1: Database Stores Configuration**
```typescript
// CronJob table stores:
{
  id: "cron-1",
  name: "log_cleanup",           // ← Unique identifier
  description: "Clean up old logs",
  schedule: "0 2 * * *",         // ← Cron expression
  enabled: true,                 // ← Can be toggled via UI
  lastRun: "2025-10-21T02:00:00Z",
  nextRun: "2025-10-22T02:00:00Z"
}
```

**Step 2: Handler Function in `/lib/cron.ts`**
```typescript
// THIS IS WHERE THE ACTUAL WORK HAPPENS
export async function cleanupOldLogs(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    // Get retention settings from database
    const settings = await prisma.systemSettings.findUnique({
      where: { key: "log_retention" }
    })

    const retention = settings.value as {
      auditLogs: 90,
      sessionLogs: 30,
      appLogs: 30,
      rateLimitLogs: 7
    }

    // Delete old logs
    const deleted = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: new Date(Date.now() - retention.auditLogs * 24 * 60 * 60 * 1000)
        }
      }
    })

    return {
      success: true,
      recordsAffected: deleted.count,
      output: `Deleted ${deleted.count} old log entries`
    }
  } catch (error) {
    return {
      success: false,
      recordsAffected: 0,
      output: error.message
    }
  }
}
```

**Step 3: Scheduler Maps Names to Handlers** (`/lib/cron-scheduler.ts`)
```typescript
function getJobHandler(jobName: string): (() => Promise<void>) | null {
  const handlers: Record<string, () => Promise<void>> = {
    // Map database job name → handler function
    log_cleanup: async () => {
      const result = await cleanupOldLogs()  // ← Calls function from cron.ts
      console.log(`[Cron] Log cleanup completed: ${result.output}`)
    },

    system_health_check: async () => {
      const result = await checkSystemHealth()
      console.log(`[Cron] Health check completed: ${result.output}`)
    },

    analytics_refresh: async () => {
      const result = await refreshAnalytics()
      console.log(`[Cron] Analytics refresh completed: ${result.output}`)
    },
  }

  return handlers[jobName] || null
}
```

**Step 4: Auto-Initialization** (`/instrumentation.ts`)
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeCronJobs } = await import("./lib/cron-scheduler")

    // This runs automatically when server starts!
    await initializeCronJobs()
  }
}
```

**Step 5: Scheduler Schedules Jobs** (`/lib/cron-scheduler.ts`)
```typescript
export async function initializeCronJobs() {
  // Fetch all enabled jobs from database
  const jobs = await prisma.cronJob.findMany({
    where: { enabled: true }
  })

  for (const job of jobs) {
    // Schedule each job with node-cron
    const task = cron.schedule(job.schedule, async () => {
      const handler = getJobHandler(job.name)
      if (handler) {
        await handler()  // ← Executes the actual work
      }
    })

    // Keep track of running tasks
    activeTasks.set(job.name, { name: job.name, schedule: job.schedule, task })
  }
}
```

---

## 3. How to Add a New Cron Job

### Full Example: Add "Send Daily Report" Job

**Step 1: Create the Handler Function** (`/lib/cron.ts`)
```typescript
export async function sendDailyReport(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    // Your business logic here
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const stats = await prisma.auditLog.groupBy({
      by: ["action"],
      where: { timestamp: { gte: last24h } },
      _count: { id: true }
    })

    // Send report via Telegram or email
    const telegramSettings = await prisma.systemSettings.findUnique({
      where: { key: "telegram_config" }
    })

    if (telegramSettings?.value.enabled) {
      await sendTelegramMessage(
        telegramSettings.value,
        {
          text: `📊 Daily Report\n\nTotal actions: ${stats.length}\n...`
        }
      )
    }

    return {
      success: true,
      recordsAffected: stats.length,
      output: `Sent daily report with ${stats.length} action types`
    }
  } catch (error: any) {
    return {
      success: false,
      recordsAffected: 0,
      output: error.message
    }
  }
}
```

**Step 2: Register the Handler** (`/lib/cron-scheduler.ts`)
```typescript
function getJobHandler(jobName: string): (() => Promise<void>) | null {
  const handlers: Record<string, () => Promise<void>> = {
    log_cleanup: async () => { /* ... */ },
    system_health_check: async () => { /* ... */ },
    analytics_refresh: async () => { /* ... */ },

    // ✅ ADD YOUR NEW JOB HERE
    send_daily_report: async () => {
      const result = await sendDailyReport()
      console.log(`[Cron] Daily report: ${result.output}`)
    },
  }

  return handlers[jobName] || null
}
```

**Step 3: Add to Database** (two options)

**Option A: Via Init Script** (`/scripts/init-system.ts`)
```typescript
await prisma.cronJob.upsert({
  where: { name: "send_daily_report" },
  create: {
    name: "send_daily_report",
    description: "Send daily activity report via Telegram",
    schedule: "0 9 * * *", // 9 AM daily
    enabled: true,
  },
  update: {},
})
```

Then run: `npx tsx scripts/init-system.ts`

**Option B: Direct Database Insert**
```sql
INSERT INTO "CronJob" (id, name, description, schedule, enabled)
VALUES (
  'send-daily-report-id',
  'send_daily_report',
  'Send daily activity report via Telegram',
  '0 9 * * *',
  true
);
```

**Step 4: Restart Server**
```bash
# The job will be auto-scheduled on startup
npm run dev
```

You should see:
```
[Cron Scheduler] Scheduled job: send_daily_report (0 9 * * *)
```

**Step 5: Test Manually** (via UI)
- Go to `/admin/cron`
- Find "Send Daily Report" job
- Click "Run Now"
- Check execution history

---

## 4. Visual Flow Diagram

### Settings Flow:
```
┌─────────────┐
│   UI Form   │  Admin changes Telegram config
│ /admin/     │
│  settings   │
└──────┬──────┘
       │ POST /api/admin/settings
       ▼
┌─────────────────┐
│  API Endpoint   │  Validates & saves to DB
│  route.ts       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   Database      │  Settings stored as JSON
│ SystemSettings  │  {key: "telegram_config", value: {...}}
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Alert System   │  Reads settings when needed
│  alerts.ts      │  No restart required!
└─────────────────┘
```

### Cron Flow:
```
Server Startup
      │
      ▼
┌──────────────────┐
│instrumentation.ts│  Auto-runs
└────────┬─────────┘
         │
         ▼
┌─────────────────────┐
│ cron-scheduler.ts   │  Loads enabled jobs from DB
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   node-cron         │  Schedules: "0 2 * * *"
└────────┬────────────┘
         │ (when schedule triggers)
         ▼
┌─────────────────────┐
│  Job Handler        │  cleanupOldLogs()
│  cron.ts            │  Does actual work
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Database          │  Logs execution result
│  CronExecution      │  {status, duration, output}
└─────────────────────┘
```

---

## 5. Key Architectural Benefits

### Settings in Database:
✅ **No restart needed** - Changes apply immediately
✅ **Audit trail** - Track who changed what and when
✅ **UI-configurable** - Non-developers can modify
✅ **Version control safe** - No secrets in .env files
✅ **Multi-instance compatible** - All servers share same config

### Cron in Code + DB:
✅ **Type-safe** - TypeScript ensures correct handler signatures
✅ **Testable** - Each handler is a pure function
✅ **Manageable** - Enable/disable via UI without code changes
✅ **Observable** - Full execution history in database
✅ **Flexible** - Change schedules without redeploying

---

## Summary

**Settings:** Database-driven for flexibility, UI changes apply instantly
**Cron Jobs:** Code handlers + DB config, best of both worlds
**Adding Jobs:** Three simple steps (handler → register → database)
**Server Logs:** You'll see all changes logged with `[INFO][admin]` prefix

This architecture gives you the power of code (type safety, version control) with the flexibility of database (runtime changes, no restarts)! 🚀
