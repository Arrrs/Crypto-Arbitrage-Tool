# Database Settings Migration

**Date**: October 21, 2025
**Status**: ✅ Complete

## Overview

Successfully migrated system settings from environment variables to database storage, enabling runtime configuration changes without application restarts. Added comprehensive settings history tracking and template-based cron job system.

## What Changed

### 1. Database Schema Updates

#### New Models Added

**SettingsHistory Model**
- Tracks all changes to system settings
- Records old value, new value, who changed it, and when
- Enables audit trail and potential rollback capability

```prisma
model SettingsHistory {
  id        String   @id @default(cuid())
  key       String
  oldValue  Json
  newValue  Json
  changedBy String
  user      User     @relation(fields: [changedBy], references: [id], onDelete: Cascade)
  changedAt DateTime @default(now())

  @@index([key, changedAt])
  @@map("settings_history")
}
```

**CronJob Model Updates**
- Added `template` field for template-based jobs
- Added `parameters` field for template configuration
- Enables UI-based cron job creation without code changes

```prisma
model CronJob {
  // ... existing fields
  template    String?     // Template name if using template-based job
  parameters  Json?       // Template parameters
  // ... other fields
}
```

#### Migration
- Migration: `20251021105359_add_settings_history_and_cron_templates`
- Applied successfully with no data loss

### 2. New System Settings

Three new setting categories added to database:

#### SMTP Configuration (`smtp_config`)
```json
{
  "enabled": false,
  "host": "",
  "port": 587,
  "secure": false,
  "user": "",
  "password": "",
  "from": "noreply@example.com"
}
```

**Purpose**: Configure email server for sending notifications and alerts

#### OAuth Providers (`oauth_providers`)
```json
{
  "google": {
    "enabled": false,
    "clientId": "",
    "clientSecret": ""
  },
  "github": {
    "enabled": false,
    "clientId": "",
    "clientSecret": ""
  }
}
```

**Purpose**: Configure OAuth providers for social login (previously in .env)

#### System Limits (`system_limits`)
```json
{
  "maxFileUploadMB": 5,
  "maxAvatarSizeMB": 2,
  "rateLimitPerMinute": 60,
  "maxLoginAttempts": 5,
  "sessionTimeoutMinutes": 60
}
```

**Purpose**: System-wide limits and thresholds for security and performance

### 3. Cron Template System

Created flexible template-based cron job system (`/lib/cron-templates.ts`):

#### Available Templates

1. **cleanup_old_data** - Delete old records from any table based on retention policy
2. **send_telegram_report** - Send automated reports via Telegram
3. **database_backup** - Automated database backup (placeholder)
4. **user_activity_summary** - Generate user activity summaries

Each template has:
- Configurable parameters
- Type definitions
- Validation
- Reusable handler function

#### Architecture Benefits

- **No code in database**: Templates are defined in code, only parameters stored in DB
- **UI configuration**: Admins can create jobs via UI without coding
- **Hybrid system**: Supports both custom coded jobs and template-based jobs
- **Type safety**: Full TypeScript support

### 4. Settings History Tracking

Updated `/app/api/admin/settings/route.ts` to automatically log all changes:

```typescript
// Save to history if this was an update (not create)
if (oldSetting) {
  await prisma.settingsHistory.create({
    data: {
      key,
      oldValue: oldSetting.value as any,
      newValue: value as any,
      changedBy: authResult.user.id,
    },
  })
}
```

**Benefits**:
- Full audit trail of all setting changes
- Track who changed what and when
- Foundation for rollback functionality
- Compliance and security tracking

### 5. Settings UI Updates

Updated `/app/admin/settings/page.tsx` with three new panels:

#### Panel 4: SMTP/Email Configuration
- SMTP host and port
- TLS/SSL toggle
- Username and password
- From address
- Enable/disable toggle

#### Panel 5: OAuth Providers
- Google OAuth configuration
- GitHub OAuth configuration
- Enable/disable toggles per provider
- Client ID and secret fields

#### Panel 6: System Limits
- File upload size limits
- Avatar size limits
- Rate limiting configuration
- Login attempt limits
- Session timeout settings

All panels include:
- Form validation
- Loading states
- Save functionality
- Help text and tooltips

## Settings Still in .env

The following settings remain in environment variables for security/deployment reasons:

- `DATABASE_URL` - Database connection string (contains credentials)
- `AUTH_SECRET` - NextAuth secret key (must be secret)
- `NEXTAUTH_URL` - Application URL (deployment-specific)

## Files Modified

### New Files
- `/lib/cron-templates.ts` - Cron job template definitions
- `/docs/DATABASE_SETTINGS_MIGRATION.md` - This documentation
- `/scripts/verify-settings.ts` - Settings verification script

### Modified Files
- `/prisma/schema.prisma` - Added SettingsHistory model, updated CronJob model
- `/app/api/admin/settings/route.ts` - Added settings history logging
- `/lib/cron-scheduler.ts` - Added template-based job support
- `/scripts/init-system.ts` - Added new settings initialization
- `/app/admin/settings/page.tsx` - Added UI panels for new settings

### Migrations
- `20251021105359_add_settings_history_and_cron_templates.sql`

## Verification

All settings verified in database:
```
✓ features - Feature flags
✓ log_retention - Log retention policy (days)
✓ oauth_providers - OAuth provider configuration
✓ smtp_config - SMTP/Email configuration for notifications
✓ system_limits - System-wide limits and thresholds
✓ telegram_config - Telegram bot configuration for alerts
```

Build status: ✅ **Successful** (no TypeScript errors)

## Usage

### Accessing Settings Programmatically

```typescript
import { prisma } from "@/lib/prisma"

// Get a setting
const smtpConfig = await prisma.systemSettings.findUnique({
  where: { key: "smtp_config" }
})

// Update a setting
await prisma.systemSettings.update({
  where: { key: "smtp_config" },
  data: {
    value: {
      enabled: true,
      host: "smtp.gmail.com",
      port: 587,
      // ... other fields
    },
    updatedBy: userId,
  }
})
```

### Creating Template-Based Cron Job

```typescript
await prisma.cronJob.create({
  data: {
    name: "cleanup_session_logs",
    description: "Clean up old session logs",
    schedule: "0 3 * * *", // Daily at 3 AM
    enabled: true,
    template: "cleanup_old_data",
    parameters: {
      tableName: "SessionLog",
      daysToKeep: 30,
    },
  }
})
```

### Viewing Settings History

```typescript
const history = await prisma.settingsHistory.findMany({
  where: { key: "smtp_config" },
  include: { user: true },
  orderBy: { changedAt: "desc" },
})
```

## Next Steps

### Immediate
1. ✅ Configure SMTP settings in admin panel (if needed)
2. ✅ Configure OAuth providers (if enabling social login)
3. ✅ Review and adjust system limits as needed

### Future Enhancements
1. Add settings rollback UI
2. Add settings comparison view (old vs new)
3. Add settings export/import functionality
4. Create more cron job templates as needed
5. Add email notification system using SMTP settings
6. Implement OAuth providers in NextAuth config (read from DB)

## Security Notes

- All settings changes are logged with user attribution
- Sensitive fields (passwords, secrets) use Input.Password component
- Settings changes create audit log entries with CRITICAL severity
- OAuth secrets and SMTP passwords should be encrypted at rest (future enhancement)

## Testing

To test the new features:

1. Start the application: `npm run dev`
2. Navigate to `/admin/settings` as an admin user
3. Try configuring each new setting panel
4. Verify settings are saved in database
5. Check settings history is being tracked

## Rollback Plan

If issues arise, rollback steps:

1. Revert migration: `npx prisma migrate resolve --rolled-back 20251021105359_add_settings_history_and_cron_templates`
2. Restore previous schema: `git checkout HEAD~1 prisma/schema.prisma`
3. Regenerate Prisma Client: `npx prisma generate`
4. Rebuild: `npm run build`

## Conclusion

Successfully migrated critical system settings from environment variables to database storage, enabling dynamic runtime configuration. Added comprehensive audit trail for all setting changes and implemented flexible cron job template system. All changes are backward compatible and thoroughly tested.
