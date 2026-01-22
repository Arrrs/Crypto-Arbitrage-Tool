# Quick Guide: Add a New Cron Job

## 3-Step Process

### Step 1: Write the Handler Function

**File:** `/lib/cron.ts`

```typescript
/**
 * Your New Job Description
 */
export async function yourNewJobName(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    // Your business logic here
    // Example: Send emails, cleanup data, generate reports, etc.

    const result = await doSomething()

    return {
      success: true,
      recordsAffected: result.count,
      output: `Successfully processed ${result.count} items`
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

### Step 2: Register in Scheduler

**File:** `/lib/cron-scheduler.ts`

Find the `getJobHandler` function and add your job:

```typescript
function getJobHandler(jobName: string): (() => Promise<void>) | null {
  const handlers: Record<string, () => Promise<void>> = {
    log_cleanup: async () => { /* ... */ },
    system_health_check: async () => { /* ... */ },
    analytics_refresh: async () => { /* ... */ },

    // ✅ ADD YOUR JOB HERE
    your_job_name: async () => {
      const result = await yourNewJobName()
      console.log(`[Cron] Your job: ${result.output}`)
    },
  }

  return handlers[jobName] || null
}
```

### Step 3: Add to Database

**File:** `/scripts/init-system.ts`

Add to the `initializeCronJobs` function:

```typescript
export async function initializeCronJobs() {
  const jobs = [
    {
      name: "log_cleanup",
      description: "Clean up old log entries",
      schedule: "0 2 * * *",
      enabled: true,
    },
    {
      name: "system_health_check",
      description: "Monitor system health",
      schedule: "*/15 * * * *",
      enabled: true,
    },
    {
      name: "analytics_refresh",
      description: "Pre-calculate analytics data",
      schedule: "0 */6 * * *",
      enabled: true,
    },
    // ✅ ADD YOUR JOB HERE
    {
      name: "your_job_name",
      description: "What your job does",
      schedule: "0 3 * * *", // 3 AM daily
      enabled: true,
    },
  ]

  for (const job of jobs) {
    await prisma.cronJob.upsert({
      where: { name: job.name },
      create: job,
      update: {},
    })
  }
}
```

### Step 4: Initialize & Restart

```bash
# Run init script to create the job in database
npx tsx scripts/init-system.ts

# Restart your dev server
npm run dev
```

You should see:
```
[Cron Scheduler] Scheduled job: your_job_name (0 3 * * *)
```

---

## Cron Schedule Examples

```
*/5 * * * *     Every 5 minutes
*/15 * * * *    Every 15 minutes
0 * * * *       Every hour (at minute 0)
0 */6 * * *     Every 6 hours
0 2 * * *       Daily at 2:00 AM
0 9 * * *       Daily at 9:00 AM
0 0 * * 0       Every Sunday at midnight
0 3 * * 1       Every Monday at 3:00 AM
0 0 1 * *       First day of every month at midnight
```

Test your cron expression: https://crontab.guru/

---

## Testing Your Job

### Option 1: Manual Test via UI
1. Go to `/admin/cron`
2. Find your job in the list
3. Click "Run Now"
4. Check execution history

### Option 2: Direct Function Test
Create a test file: `/scripts/test-cron-job.ts`

```typescript
import { PrismaClient } from "@prisma/client"
import { yourNewJobName } from "../lib/cron"

const prisma = new PrismaClient()

async function main() {
  console.log("Testing cron job...")
  const result = await yourNewJobName()
  console.log("Result:", result)
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error)
    prisma.$disconnect()
    process.exit(1)
  })
```

Run:
```bash
npx tsx scripts/test-cron-job.ts
```

---

## Common Patterns

### Pattern 1: Cleanup Old Data
```typescript
export async function cleanupOldData() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

  const deleted = await prisma.someModel.deleteMany({
    where: { createdAt: { lt: cutoff } }
  })

  return {
    success: true,
    recordsAffected: deleted.count,
    output: `Deleted ${deleted.count} old records`
  }
}
```

### Pattern 2: Send Notifications
```typescript
export async function sendWeeklyReport() {
  // Gather data
  const stats = await prisma.auditLog.count({
    where: { timestamp: { gte: oneWeekAgo } }
  })

  // Get Telegram config
  const telegramSettings = await prisma.systemSettings.findUnique({
    where: { key: "telegram_config" }
  })

  // Send notification
  if (telegramSettings?.value.enabled) {
    await sendTelegramMessage(telegramSettings.value, {
      text: `📊 Weekly Report\n\nActions: ${stats}`
    })
  }

  return {
    success: true,
    recordsAffected: 1,
    output: "Weekly report sent"
  }
}
```

### Pattern 3: Data Processing
```typescript
export async function processQueuedItems() {
  const items = await prisma.queueItem.findMany({
    where: { status: "PENDING" },
    take: 100
  })

  let processed = 0
  for (const item of items) {
    await processItem(item)
    await prisma.queueItem.update({
      where: { id: item.id },
      data: { status: "COMPLETED" }
    })
    processed++
  }

  return {
    success: true,
    recordsAffected: processed,
    output: `Processed ${processed} items`
  }
}
```

---

## Troubleshooting

### Job Not Running?
1. Check if enabled: Go to `/admin/cron`, verify switch is ON
2. Check handler exists: Look in `getJobHandler()` in `cron-scheduler.ts`
3. Check schedule: Verify cron expression is valid
4. Check server logs: Look for errors during execution

### Job Failing?
1. Check execution logs in `/admin/cron`
2. Test the handler function directly (see "Testing Your Job")
3. Check database permissions
4. Verify all required settings exist in database

### Job Not Appearing in UI?
1. Run init script: `npx tsx scripts/init-system.ts`
2. Check database: `SELECT * FROM "CronJob";`
3. Restart server: The UI loads from database

---

## Best Practices

✅ **Always return proper result object** with success, recordsAffected, output
✅ **Use try/catch** to handle errors gracefully
✅ **Log meaningful messages** that appear in execution history
✅ **Keep jobs idempotent** - safe to run multiple times
✅ **Limit batch size** - Don't process millions of records at once
✅ **Use transactions** for related database operations
✅ **Set reasonable schedules** - Don't run every minute unless needed
✅ **Test before enabling** - Use manual "Run Now" first

---

That's it! Three files, three steps, done! 🎉
