# Developer Guide

Complete guide for developers to extend and customize the system.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Adding Cron Jobs](#adding-cron-jobs)
- [Adding System Settings](#adding-system-settings)
- [Extending Alert System](#extending-alert-system)
- [Adding New Log Types](#adding-new-log-types)
- [Code Patterns](#code-patterns)
- [Testing Guidelines](#testing-guidelines)
- [Deployment](#deployment)

---

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: NextAuth v5
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Ant Design 5 (AntD)
- **Language**: TypeScript
- **Scheduling**: node-cron (self-hosted)
- **Email**: Nodemailer
- **Geolocation**: ip-api.com

### Directory Structure

```
/app                   # Next.js App Router pages
  /api                 # API routes
    /admin             # Admin-only endpoints
    /auth              # Authentication endpoints
  /admin               # Admin panel pages
  /dashboard           # User dashboard
  /login               # Login page
  /signup              # Registration page

/lib                   # Utility libraries
  /prisma.ts           # Prisma client
  /logger.ts           # Logging utilities
  /cron.ts             # Cron job scheduler
  /cron-templates.ts   # Reusable cron templates
  /geolocation.ts      # IP geolocation
  /telegram.ts         # Telegram notifications
  /email.ts            # Email utilities
  /admin.ts            # Admin middleware

/prisma                # Database schema
  /schema.prisma       # Database models

/scripts               # Utility scripts
  /init-system.ts      # System initialization

/docs                  # Documentation
```

---

## Adding Cron Jobs

### Method 1: Using Templates (Recommended)

Templates allow creating jobs via UI without code changes.

**Step 1: Create Template** in `/lib/cron-templates.ts`:

```typescript
const myCustomTemplate: CronTemplate = {
  id: "my_custom_job",
  name: "My Custom Job",
  description: "Does something useful",
  icon: "🚀",
  category: "maintenance", // or "notifications", "analytics", "monitoring"
  parameters: [
    {
      name: "targetCount",
      type: "number",
      label: "Target Count",
      description: "How many items to process",
      default: 100,
      min: 1,
      max: 1000,
      required: true,
    },
    {
      name: "notifyOnComplete",
      type: "boolean",
      label: "Send Notification",
      description: "Notify via Telegram when done",
      default: true,
    },
  ],
  handler: async (params) => {
    const { targetCount, notifyOnComplete } = params

    // Your job logic here
    const results = await prisma.myTable.findMany({
      take: targetCount,
    })

    // Process results...
    let processed = 0
    for (const item of results) {
      // Do something with item
      processed++
    }

    // Optional: Send notification
    if (notifyOnComplete) {
      const telegramSettings = await prisma.systemSettings.findUnique({
        where: { key: "telegram_config" },
      })

      if (telegramSettings?.value && (telegramSettings.value as any).enabled) {
        const config = telegramSettings.value as { botToken: string; chatId: string }
        await sendTelegramMessage(config, {
          text: `✅ Job Complete\n\nProcessed: ${processed} items`,
        })
      }
    }

    return {
      success: true,
      recordsAffected: processed,
      output: `Processed ${processed} items successfully`,
    }
  },
}
```

**Step 2: Register Template**:

```typescript
export const cronTemplates: Record<string, CronTemplate> = {
  // ... existing templates
  my_custom_job: myCustomTemplate,
}
```

**Step 3: Create Job Instance** in `/scripts/init-system.ts`:

```typescript
await prisma.cronJob.upsert({
  where: { name: "my_custom_task" },
  create: {
    name: "my_custom_task",
    description: "My custom task that runs daily",
    schedule: "0 3 * * *", // Daily at 3 AM
    enabled: true,
    template: "my_custom_job",
    parameters: {
      targetCount: 200,
      notifyOnComplete: true,
    },
  },
  update: {},
})
```

**Step 4: Run Init Script**:

```bash
npx tsx scripts/init-system.ts
```

### Method 2: Direct Implementation

For jobs that don't need UI configuration:

**Add to `/lib/cron.ts`**:

```typescript
export async function myDirectJob() {
  try {
    // Your logic here
    const result = await prisma.myTable.updateMany({
      where: { status: "pending" },
      data: { status: "processed" },
    })

    return {
      success: true,
      recordsAffected: result.count,
      output: `Processed ${result.count} records`,
    }
  } catch (error) {
    console.error("Job failed:", error)
    return {
      success: false,
      recordsAffected: 0,
      output: `Error: ${error.message}`,
    }
  }
}
```

**Schedule in `/lib/cron.ts`**:

```typescript
export function startCronJobs() {
  // ... existing jobs

  // Your new job
  cron.schedule("0 4 * * *", async () => {
    console.log("Running myDirectJob...")
    const result = await myDirectJob()
    console.log("Result:", result.output)
  })
}
```

### Cron Schedule Syntax

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday=0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples**:
- `*/5 * * * *` - Every 5 minutes
- `0 2 * * *` - Daily at 2 AM
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight
- `0 9-17 * * 1-5` - Every hour from 9 AM to 5 PM, Monday-Friday

---

## Adding System Settings

Settings are stored in the `system_settings` table and update instantly (no restart required).

### Step 1: Define Setting Key

Choose a unique key like `my_feature_config`.

### Step 2: Add to Settings UI

**Edit `/app/admin/settings/page.tsx`**:

```typescript
// Add state for your settings
const [myFeatureForm] = Form.useForm()
const [savingMyFeature, setSavingMyFeature] = useState(false)

// Add save function
const saveMyFeature = async () => {
  setSavingMyFeature(true)
  try {
    const values = await myFeatureForm.validateFields()

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "my_feature_config",
        value: {
          enabled: values.enabled,
          threshold: values.threshold,
          // ... other fields
        },
      }),
    })

    if (res.ok) {
      message.success("Settings saved")
    } else {
      message.error("Failed to save settings")
    }
  } catch (error) {
    message.error("Invalid settings")
  } finally {
    setSavingMyFeature(false)
  }
}

// Load settings
const loadSettings = async () => {
  // ... existing code

  // Add your settings
  case "my_feature_config":
    myFeatureForm.setFieldsValue({
      enabled: value.enabled === true,
      threshold: value.threshold || 100,
    })
    break
}

// Add to UI in return statement
<Collapse.Panel key="6" header="⚙️ My Feature Configuration">
  <Form form={myFeatureForm} layout="vertical">
    <Form.Item
      name="enabled"
      label="Enable Feature"
      valuePropName="checked"
    >
      <Switch />
    </Form.Item>

    <Form.Item
      name="threshold"
      label="Threshold Value"
      rules={[{ required: true }]}
    >
      <InputNumber min={1} max={1000} style={{ width: "100%" }} />
    </Form.Item>

    <Button
      type="primary"
      loading={savingMyFeature}
      onClick={saveMyFeature}
    >
      Save
    </Button>
  </Form>
</Collapse.Panel>
```

### Step 3: Use Settings in Code

```typescript
// In any API route or server function
const myFeatureSettings = await prisma.systemSettings.findUnique({
  where: { key: "my_feature_config" },
})

if (myFeatureSettings?.value) {
  const config = myFeatureSettings.value as {
    enabled: boolean
    threshold: number
  }

  if (config.enabled) {
    // Use config.threshold
  }
}
```

### Step 4: Initialize Default Values

**Add to `/scripts/init-system.ts`**:

```typescript
await prisma.systemSettings.upsert({
  where: { key: "my_feature_config" },
  create: {
    key: "my_feature_config",
    value: {
      enabled: false,
      threshold: 100,
    },
  },
  update: {},
})
```

---

## Extending Alert System

### Adding New Alert Types

**Step 1: Define Alert Condition**

Edit `/lib/cron.ts` in the `checkAlerts()` function:

```typescript
async function checkAlerts() {
  const alerts = await prisma.alertRule.findMany({
    where: { enabled: true },
  })

  for (const alert of alerts) {
    let shouldTrigger = false
    let context: any = {}

    if (alert.condition.type === "YOUR_NEW_TYPE") {
      // Your condition logic
      const threshold = alert.condition.threshold
      const timeWindow = alert.condition.timeWindowMinutes

      const count = await prisma.yourTable.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - timeWindow * 60 * 1000),
          },
          // Your conditions
        },
      })

      shouldTrigger = count >= threshold
      context = {
        count,
        threshold,
        timeWindow,
      }
    }

    if (shouldTrigger) {
      await triggerAlert(alert, context)
    }
  }
}
```

**Step 2: Add to Alert UI**

Edit `/app/admin/alerts/page.tsx`:

```typescript
// Add to alert type select options
<Select placeholder="Select alert type">
  <Select.Option value="FAILED_LOGIN">Failed Login Attempts</Select.Option>
  <Select.Option value="ERROR_SPIKE">Error Spike</Select.Option>
  <Select.Option value="YOUR_NEW_TYPE">Your New Alert</Select.Option>
</Select>

// Add condition fields
{alertType === "YOUR_NEW_TYPE" && (
  <>
    <Form.Item
      name="threshold"
      label="Threshold"
      rules={[{ required: true }]}
    >
      <InputNumber min={1} style={{ width: "100%" }} />
    </Form.Item>

    <Form.Item
      name="timeWindow"
      label="Time Window (minutes)"
      rules={[{ required: true }]}
    >
      <InputNumber min={1} max={1440} style={{ width: "100%" }} />
    </Form.Item>
  </>
)}
```

### Adding New Notification Channels

**Step 1: Create Channel Handler**

Create `/lib/slack.ts` (or other service):

```typescript
export async function sendSlackMessage(config: any, message: any) {
  const { webhookUrl } = config

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: message.text,
      // Slack-specific formatting
    }),
  })

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`)
  }
}
```

**Step 2: Add to Alert Trigger Logic**

Edit `/lib/cron.ts`:

```typescript
async function triggerAlert(alert: AlertRule, context: any) {
  // ... existing code

  for (const channel of alert.channels) {
    if (channel.type === "SLACK" && channel.enabled) {
      await sendSlackMessage(channel.config, {
        text: formatAlertMessage(alert, context),
      })
    }
  }
}
```

**Step 3: Add to Alert UI**

Add Slack toggle and configuration in alert modal.

---

## Adding New Log Types

### Step 1: Update Schema

Edit `/prisma/schema.prisma`:

```prisma
model CustomLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  details   Json?
  ipAddress String?
  country   String?
  city      String?
  timestamp DateTime @default(now())

  @@index([userId])
  @@index([timestamp])
}
```

**Run Migration**:

```bash
npx prisma migrate dev --name add_custom_log
```

### Step 2: Create Logging Function

Add to `/lib/logger.ts`:

```typescript
export async function logCustomAction(params: {
  userId?: string
  action: string
  details?: any
  request?: Request
}) {
  const { userId, action, details, request } = params

  let ipAddress: string | null = null

  if (request) {
    ipAddress = getClientIP(request)
  }

  await prisma.customLog.create({
    data: {
      userId,
      action,
      details,
      ipAddress,
      // country and city null initially (on-demand geolocation)
    },
  })
}
```

### Step 3: Add API Endpoint

Create `/app/api/admin/logs/custom/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const logs = await prisma.customLog.findMany({
    take: 100,
    orderBy: { timestamp: "desc" },
  })

  return NextResponse.json({ logs })
}
```

### Step 4: Add to Logs UI

Add new tab in `/app/admin/logs/page.tsx`:

```typescript
<Tabs.TabPane tab="Custom Logs" key="custom">
  <Table
    dataSource={customLogs}
    columns={[
      { title: "Timestamp", dataIndex: "timestamp", render: formatDate },
      { title: "User", dataIndex: "userId" },
      { title: "Action", dataIndex: "action" },
      { title: "IP", dataIndex: "ipAddress" },
    ]}
  />
</Tabs.TabPane>
```

---

## Code Patterns

### Admin Middleware

All admin routes must use `requireAdmin()`:

```typescript
import { requireAdmin } from "@/lib/admin"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  // Admin-only logic here
}
```

### Audit Logging

Log all admin actions:

```typescript
import { logAdminAction } from "@/lib/logger"

await logAdminAction({
  adminId: authResult.user.id,
  action: "USER_ROLE_CHANGED",
  resource: "USER",
  resourceId: userId,
  details: {
    oldRole: user.role,
    newRole: "ADMIN",
  },
  severity: "WARNING",
  request,
})
```

### Error Handling

Always log errors to application logs:

```typescript
try {
  // Your code
} catch (error: any) {
  await prisma.appLog.create({
    data: {
      level: "ERROR",
      category: "api",
      message: error.message,
      metadata: {
        stack: error.stack,
        endpoint: request.url,
      },
    },
  })

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  )
}
```

### Database Queries

Use Prisma for all database operations:

```typescript
// Good
const users = await prisma.user.findMany({
  where: { emailVerified: true },
  select: { id: true, name: true, email: true },
  orderBy: { createdAt: "desc" },
})

// Bad - Raw SQL (avoid unless absolutely necessary)
const users = await prisma.$queryRaw`SELECT * FROM users`
```

### API Response Format

Consistent response structure:

```typescript
// Success
return NextResponse.json({
  success: true,
  data: results,
  message: "Operation completed",
})

// Error
return NextResponse.json(
  {
    error: "Something went wrong",
    details: "Specific error message",
  },
  { status: 400 }
)
```

---

## Testing Guidelines

### Manual Testing

1. **Auth Flow**:
   - Register new user
   - Verify email
   - Login
   - Logout
   - Password reset

2. **Admin Features**:
   - User management (create, edit, delete)
   - Role changes
   - Settings updates
   - Cron job execution
   - Alert testing

3. **Logging**:
   - Check all log types populate
   - Test geolocation lookup
   - Verify export functionality

4. **Alerts**:
   - Trigger conditions manually
   - Test Telegram notifications
   - Test Email notifications
   - Check cooldown behavior

### Database Testing

```bash
# Connect to database
psql -h localhost -U your_user -d your_db

# Check records
SELECT COUNT(*) FROM users;
SELECT * FROM cron_jobs WHERE enabled = true;
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;

# Test data cleanup
DELETE FROM session_logs WHERE timestamp < NOW() - INTERVAL '30 days';
```

### API Testing

Use curl or Postman:

```bash
# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Test admin endpoint (requires session cookie)
curl http://localhost:3000/api/admin/users \
  -H "Cookie: your-session-cookie"
```

---

## Deployment

### Environment Variables

Required for production:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-at-least-32-characters"
NEXTAUTH_URL="https://your-domain.com"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@your-domain.com"
```

### Build and Run

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Start production server
npm start
```

### Docker Deployment

See [SETUP.md](SETUP.md#docker-setup) for Docker configuration.

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

**Note**: Cron jobs require external scheduler (like Vercel Cron or GitHub Actions) in serverless environments.

### Production Checklist

- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Configure proper SMTP credentials
- [ ] Set up database backups
- [ ] Configure Telegram bot (optional)
- [ ] Set log retention policies
- [ ] Test alert notifications
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Review rate limits
- [ ] Test geolocation lookup
- [ ] Verify cron jobs run correctly

---

## Performance Optimization

### Database Indexes

Indexes are already set up for common queries. Add more if needed:

```prisma
model CustomLog {
  // ... fields

  @@index([userId, timestamp])
  @@index([action])
}
```

### Query Optimization

```typescript
// Good - Select only needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true },
})

// Bad - Fetches all fields
const users = await prisma.user.findMany()
```

### Caching

API quota is already optimized with:
- Memory cache (24h) for geolocation
- Database cache (permanent) for geolocation
- Settings cached in component state

Add more caching if needed:

```typescript
// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(key: string) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}
```

---

## Security Best Practices

### Input Validation

Always validate user input:

```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["USER", "PREMIUM", "ADMIN"]),
})

const parsed = schema.parse(body)
```

### Rate Limiting

Rate limiting is already implemented. Add more limits if needed:

```typescript
import { rateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const limited = await rateLimit({
    identifier: getClientIP(request),
    limit: 10,
    window: 60, // 10 requests per minute
  })

  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    )
  }

  // Your logic
}
```

### Password Security

Passwords are hashed with bcrypt (12 rounds). Never log or expose passwords:

```typescript
// Good
console.log("User login:", user.email)

// Bad
console.log("User login:", user.email, password) // Never log passwords!
```

### SQL Injection Prevention

Prisma prevents SQL injection. Never use raw SQL with user input:

```typescript
// Good
await prisma.user.findMany({
  where: { email: userInput },
})

// Bad
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`
```

---

## Troubleshooting

### Common Issues

**Cron jobs not running**:
- Check job is enabled: `SELECT * FROM cron_jobs WHERE enabled = true`
- Verify app is running (not serverless without scheduler)
- Check logs: `SELECT * FROM cron_executions ORDER BY started_at DESC`

**Emails not sending**:
- Test SMTP connection in Settings
- Check credentials are correct
- Verify "enabled" toggle is on
- Look for errors in application logs

**Database connection errors**:
- Verify `DATABASE_URL` is correct
- Check database is running
- Run `npx prisma generate` after schema changes
- Run migrations: `npx prisma migrate dev`

**Build errors**:
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npx tsc --noEmit`

---

## Contributing

### Code Style

- Use TypeScript for all code
- Follow existing patterns (see [Code Patterns](#code-patterns))
- Add comments for complex logic
- Use descriptive variable names

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "Add: My new feature"

# Push and create pull request
git push origin feature/my-new-feature
```

### Commit Message Format

```
Add: New feature
Fix: Bug description
Update: Improved existing feature
Remove: Deleted unused code
Docs: Documentation updates
```

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth Documentation](https://authjs.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Ant Design Documentation](https://ant.design/components/overview/)
- [node-cron Documentation](https://github.com/node-cron/node-cron)

For more information, see:
- [FEATURES.md](FEATURES.md) - Complete feature list
- [SETUP.md](SETUP.md) - Installation instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
