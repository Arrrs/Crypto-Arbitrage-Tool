# Cron Job Template System - Explanation

## Overview

The cron job template system allows administrators to create and configure scheduled jobs through the UI without writing code. This is a **hybrid approach** that combines:
- **Template-based jobs** - Pre-defined job types with configurable parameters
- **Custom coded jobs** - Traditional hardcoded job handlers

## Why Templates Instead of Storing Code in Database?

**Security Concerns with Storing Code:**
- Arbitrary code execution risks
- Potential SQL injection through code strings
- Difficult to validate and sanitize
- Hard to version control
- Debugging and testing challenges

**Benefits of Template Approach:**
- ✅ **Secure** - Only trusted, pre-defined templates can run
- ✅ **Type-safe** - Full TypeScript validation
- ✅ **Testable** - Templates are regular TypeScript functions
- ✅ **Maintainable** - Code lives in version control
- ✅ **Flexible** - Parameters can be configured via UI

## How It Works

### 1. Template Definition

Templates are defined in [/lib/cron-templates.ts](../lib/cron-templates.ts):

```typescript
export interface CronTemplate {
  id: string                    // Unique template identifier
  name: string                  // Display name
  description: string           // What this template does
  icon: string                  // Emoji icon
  category: string              // Category for grouping
  parameters: CronTemplateParameter[]  // Configurable parameters
  handler: (params: Record<string, any>) => Promise<{
    success: boolean
    recordsAffected: number
    output: string
  }>
}
```

### 2. Parameter Types

Each template can have various parameter types:

```typescript
export interface CronTemplateParameter {
  name: string              // Parameter key
  type: "text" | "number" | "select" | "boolean"
  label: string             // Display label
  description?: string      // Help text
  required?: boolean        // Is required?
  default?: any            // Default value
  min?: number             // For number type
  max?: number             // For number type
  options?: string[]       // For select type
}
```

### 3. Database Schema

The `CronJob` model was updated to support templates:

```prisma
model CronJob {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  schedule    String              // Cron expression
  enabled     Boolean  @default(true)
  template    String?             // 🆕 Template ID (optional)
  parameters  Json?               // 🆕 Template parameters (optional)
  lastRun     DateTime?
  nextRun     DateTime?
  executions  CronExecution[]
  // ...
}
```

**How it works:**
- If `template` is `null` → Custom coded job (uses hardcoded handler)
- If `template` is set → Template-based job (uses template handler with parameters)

### 4. Job Execution Flow

```
┌─────────────────────────────────┐
│  Cron Scheduler Triggers Job   │
└────────────┬────────────────────┘
             │
             v
┌─────────────────────────────────┐
│   getJobHandler(jobName)        │  ← Async function
└────────────┬────────────────────┘
             │
             ├─── Is it in customHandlers? ───> Return custom handler
             │
             └─── Not in customHandlers
                  │
                  v
             ┌────────────────────────────┐
             │  Load job from database    │
             └────────────┬───────────────┘
                          │
                          v
                  ┌────────────────────┐
                  │  Has template?     │
                  └────────┬───────────┘
                           │
                           ├─── Yes ──> Get template & create handler
                           │            with job.parameters
                           │
                           └─── No ──> Return null
```

## Available Templates

### 1. Cleanup Old Data (`cleanup_old_data`)

**Purpose**: Delete records older than X days from any table

**Parameters**:
- `tableName` (select): Which table to clean
  - Options: AuditLog, SessionLog, AppLog, RateLimitLog
- `daysToKeep` (number): Keep records from last N days
  - Min: 1, Max: 365, Default: 30

**Example Usage**:
```typescript
{
  template: "cleanup_old_data",
  parameters: {
    tableName: "SessionLog",
    daysToKeep: 30
  }
}
```

**What it does**:
```typescript
const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
await prisma[tableName].deleteMany({
  where: {
    timestamp: { lt: cutoff }
  }
})
```

### 2. Send Telegram Report (`send_telegram_report`)

**Purpose**: Send automated reports to Telegram

**Parameters**:
- `reportType` (select): Type of report
  - Options: daily_summary, error_report, user_stats
- `includeCharts` (boolean): Include visualization data
  - Default: false

**Example Usage**:
```typescript
{
  template: "send_telegram_report",
  parameters: {
    reportType: "daily_summary",
    includeCharts: true
  }
}
```

### 3. Database Backup (`database_backup`)

**Purpose**: Create database backups

**Parameters**:
- `includeUploads` (boolean): Include uploaded files
  - Default: true
- `compressionLevel` (select): Compression level
  - Options: none, low, medium, high

**Example Usage**:
```typescript
{
  template: "database_backup",
  parameters: {
    includeUploads: true,
    compressionLevel: "medium"
  }
}
```

### 4. User Activity Summary (`user_activity_summary`)

**Purpose**: Generate user activity summaries

**Parameters**:
- `periodDays` (number): Period in days
  - Min: 1, Max: 90, Default: 7
- `minActivityCount` (number): Minimum activities
  - Min: 1, Max: 1000, Default: 1

**Example Usage**:
```typescript
{
  template: "user_activity_summary",
  parameters: {
    periodDays: 7,
    minActivityCount: 5
  }
}
```

## Custom Coded Jobs vs Template Jobs

### Custom Coded Jobs (Traditional)

Defined directly in [/lib/cron-scheduler.ts](../lib/cron-scheduler.ts):

```typescript
const customHandlers: Record<string, () => Promise<void>> = {
  log_cleanup: async () => {
    const result = await cleanupOldLogs()
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
```

**When to use**:
- Highly specialized logic
- Complex business rules
- Requires deep system integration
- Rarely needs configuration changes

### Template-Based Jobs

**When to use**:
- Repeating patterns with different parameters
- UI-configurable jobs
- Jobs that admins should control
- Similar logic, different data sources

## Creating Jobs via UI (Future Enhancement)

While template-based jobs are implemented, the UI for creating them is not yet built. When implemented, it would look like:

1. Admin clicks "Create Cron Job"
2. Selects a template from dropdown
3. Fills in parameters based on template definition
4. Sets cron schedule
5. Enables/disables the job

**Current workaround**: Create template-based jobs via database:

```typescript
await prisma.cronJob.create({
  data: {
    name: "cleanup_old_sessions",
    description: "Clean up session logs older than 30 days",
    schedule: "0 3 * * *",  // Daily at 3 AM
    enabled: true,
    template: "cleanup_old_data",
    parameters: {
      tableName: "SessionLog",
      daysToKeep: 30,
    },
  }
})
```

## Key Changes Made

### 1. Database Schema ([/prisma/schema.prisma](../prisma/schema.prisma))
- Added `template` field to CronJob model
- Added `parameters` field to store JSON configuration

### 2. Cron Scheduler ([/lib/cron-scheduler.ts](../lib/cron-scheduler.ts))
- Made `getJobHandler()` **async** (was sync before)
- Added database lookup for template-based jobs
- Hybrid system: checks customHandlers first, then templates

**Before**:
```typescript
function getJobHandler(jobName: string): (() => Promise<void>) | null {
  return customHandlers[jobName] || null
}
```

**After**:
```typescript
async function getJobHandler(jobName: string): Promise<(() => Promise<void>) | null> {
  // Check custom handlers first
  if (customHandlers[jobName]) {
    return customHandlers[jobName]
  }

  // Check for template-based job
  const job = await prisma.cronJob.findUnique({
    where: { name: jobName },
  })

  if (job?.template) {
    const template = getCronTemplate(job.template)
    if (template) {
      return async () => {
        await executeCronJob(jobName, async () => {
          const result = await template.handler(
            (job.parameters as Record<string, any>) || {}
          )
          return result
        })
      }
    }
  }

  return null
}
```

### 3. Template Library ([/lib/cron-templates.ts](../lib/cron-templates.ts))
- New file with all template definitions
- Export `getCronTemplate(id)` to retrieve templates
- Export `getAllCronTemplates()` for UI listing

### 4. Migration
- Migration: `20251021105359_add_settings_history_and_cron_templates`
- No breaking changes - existing jobs continue to work

## Security Considerations

### ✅ What's Safe

1. **Predefined handlers** - All template code is reviewed and trusted
2. **Parameter validation** - Type checking and range validation
3. **No eval()** - No dynamic code execution
4. **Database constraints** - JSON schema validation on parameters

### ⚠️ What to Watch

1. **Template parameter injection** - Always validate/sanitize parameters
2. **SQL injection** - Use Prisma's parameterized queries, never raw strings
3. **File system access** - Templates that write files need path validation
4. **External API calls** - Rate limiting and timeout handling

## Best Practices

### Creating New Templates

1. **Keep it generic** - Templates should be reusable
2. **Validate parameters** - Check types, ranges, required fields
3. **Error handling** - Return structured error responses
4. **Logging** - Log execution details for debugging
5. **Performance** - Avoid blocking operations

### Example Template Structure

```typescript
const myTemplate: CronTemplate = {
  id: "my_template",
  name: "My Template",
  description: "What this does",
  icon: "🔧",
  category: "maintenance",

  parameters: [
    {
      name: "myParam",
      type: "number",
      label: "My Parameter",
      description: "What this parameter does",
      required: true,
      min: 1,
      max: 100,
      default: 10,
    },
  ],

  handler: async (params) => {
    // Validate parameters
    const { myParam } = params
    if (!myParam || myParam < 1 || myParam > 100) {
      return {
        success: false,
        recordsAffected: 0,
        output: "Invalid parameter value"
      }
    }

    try {
      // Do the work
      const result = await doSomething(myParam)

      return {
        success: true,
        recordsAffected: result.count,
        output: `Processed ${result.count} items`
      }
    } catch (error) {
      return {
        success: false,
        recordsAffected: 0,
        output: `Error: ${error.message}`
      }
    }
  },
}
```

## Future Enhancements

1. **UI for Template-Based Job Creation**
   - Template selection dropdown
   - Dynamic parameter forms
   - Schedule builder

2. **Template Marketplace**
   - Community-contributed templates
   - Template versioning
   - Template dependencies

3. **Advanced Parameters**
   - Conditional parameters
   - Parameter dependencies
   - Multi-select options

4. **Template Testing**
   - Dry-run mode
   - Parameter validation UI
   - Execution history per template

5. **Template Categories & Search**
   - Better organization
   - Search and filter
   - Recommended templates

## Conclusion

The template-based cron job system provides a **secure, flexible, and maintainable** way to create configurable scheduled tasks without storing executable code in the database. It balances the need for customization with security best practices.
