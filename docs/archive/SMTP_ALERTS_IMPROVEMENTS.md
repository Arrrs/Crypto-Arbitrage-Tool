# SMTP Notifications and Alert System Improvements

## Summary

Enhanced the alert system with EMAIL notification support and improved SMTP notification logic.

## Changes Made

### 1. Email Alert Function - `/lib/email-db.ts`

Added `sendAlertEmail()` function for sending beautifully formatted alert notifications:

**Features**:
- Color-coded alerts based on type (ERROR_SPIKE: red, FAILED_LOGIN: yellow, CUSTOM: blue)
- Professional HTML email template with responsive design
- Includes alert name, type, message, timestamp
- Shows detailed metadata if provided
- Plain text fallback for email clients without HTML support

**Function Signature**:
```typescript
async function sendAlertEmail(
  recipientEmail: string,
  alertName: string,
  alertType: string,
  message: string,
  details?: Record<string, any>
)
```

**Email Template**:
- Border color matches alert severity
- Clean, modern design
- Readable on all devices
- Includes timestamp and all relevant details

### 2. Alert System Integration - `/lib/alerts.ts`

**Added EMAIL Channel Support**:
- Implemented EMAIL notification alongside existing Telegram support
- Reads recipient email from channel config
- Sends formatted alerts using `sendAlertEmail()`
- Logs all email sends in admin action logs
- Handles errors gracefully

**Implementation** (line 226-250):
```typescript
else if (channel.type === "EMAIL") {
  const config = channel.config as any
  const recipientEmail = config.email

  if (!recipientEmail) {
    logger.warn("Email channel has no recipient configured")
    continue
  }

  await sendAlertEmail(
    recipientEmail,
    alert.name,
    alert.type,
    message,
    metadata
  )

  logger.info(`Alert sent via Email: ${alert.name}`, {
    category: "alerts",
    metadata: { alertId, triggerId: trigger.id, email: recipientEmail },
  })
}
```

**Channel Config Structure**:
```json
{
  "type": "EMAIL",
  "config": {
    "email": "admin@example.com"
  },
  "enabled": true
}
```

### 3. Alerts Page UI Updates - `/app/admin/alerts/page.tsx`

**Added State Management**:
```typescript
const [smtpConfig, setSMTPConfig] = useState({
  enabled: false,
  from: "",
})

const [emailRecipient, setEmailRecipient] = useState("")
```

**Load SMTP Configuration**:
- Fetches SMTP settings from database on page load
- Shows whether SMTP is configured and enabled
- Displays configured "from" address

**Enhanced Modal**:
1. **SMTP Status Alert**:
   - Shows green success if SMTP is configured
   - Shows yellow warning if SMTP is not configured
   - Displays "from" email address when configured

2. **Email Recipient Input**:
   - Appears when SMTP is enabled
   - Email type validation
   - Optional field - leave empty to disable email notifications
   - Tooltip: "Leave empty to disable email notifications for this alert"

3. **Channel Building Logic**:
   - Always includes Telegram channel
   - Adds EMAIL channel only if recipient is provided
   - Properly handles edit vs create scenarios

**Modal UI**:
```tsx
<Alert
  message="Email Notifications"
  description={
    smtpConfig.enabled
      ? `SMTP is configured. Emails will be sent from ${smtpConfig.from}`
      : "Please configure SMTP settings to receive email notifications."
  }
  type={smtpConfig.enabled ? "success" : "warning"}
  showIcon
  style={{ marginBottom: 16 }}
/>

{smtpConfig.enabled && (
  <Form.Item
    label="Email Recipient"
    tooltip="Leave empty to disable email notifications for this alert"
  >
    <Input
      placeholder="admin@example.com"
      value={emailRecipient}
      onChange={(e) => setEmailRecipient(e.target.value)}
      type="email"
    />
  </Form.Item>
)}
```

**Edit Alert Loading**:
- Loads existing email recipient from alert channels
- Pre-fills email field when editing an alert with EMAIL channel

**Mobile View**:
- Automatically shows EMAIL in channels list
- No changes needed - dynamic channel display works out of the box

### 4. Cleanup - Removed Unused Files

**Deleted**:
- `/lib/email.ts` - Old email system using .env variables (replaced by `email-db.ts`)

**Verified**:
- No files importing old email.ts
- All email functions now use email-db.ts

### 5. Environment Variable Documentation

**Updated `.env`**:
```bash
# Google OAuth (Currently required in .env - NextAuth limitation)
# Note: OAuth providers in database settings UI are not yet implemented
# NextAuth loads providers at build time, migration to database requires architectural changes
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Telegram Bot Configuration (DEPRECATED - Now configured in database settings)
# TELEGRAM_BOT_TOKEN="..."
# TELEGRAM_CHAT_ID="..."

# System Configuration (DEPRECATED - Now configured in database settings)
# LOG_RETENTION_DAYS=30
# ENABLE_GEOLOCATION=true

# SMTP Configuration (DEPRECATED - Now configured in database settings)
# SMTP_HOST=...
```

**Why OAuth is Still in .env**:
- NextAuth loads providers synchronously at build time
- Database calls are async
- Migrating OAuth to database requires architectural refactoring
- Settings UI exists but is not yet functional
- This is a NextAuth limitation, not our choice

## How to Use EMAIL Alerts

### Setup

1. **Configure SMTP** in Settings:
   - Go to `/admin/settings`
   - Configure SMTP/Email settings
   - Test connection
   - Enable email notifications

2. **Create/Edit Alert**:
   - Go to `/admin/alerts`
   - Create new or edit existing alert
   - Fill in alert details (name, type, condition)
   - Enter email recipient in "Email Recipient" field
   - Save

3. **Test Alert**:
   - Click "Test" button on alert
   - Check email inbox
   - Verify alert email received

### Alert Flow

```
Condition Met (e.g., 5 failed logins in 15 min)
    ↓
checkAlert() evaluates condition
    ↓
triggerAlert() called
    ↓
Loop through enabled channels:
    - Send Telegram (if configured)
    - Send EMAIL (if configured)
    ↓
Create AlertTrigger record
    ↓
Mark as sent
    ↓
Log in admin actions
```

### Email Example

**Subject**: 🚨 Alert: Failed Login Attempts

**Body**:
```
🚨 Alert Triggered

Failed Login Attempts
5 failed login attempts detected from IP 192.168.1.100 in the last 15 minutes.

Type: SECURITY
Time: Jan 22, 2025 10:30:45 AM

Details:
• ipAddress: "192.168.1.100"
• attemptCount: 5
• timeWindow: 15

This is an automated alert from your monitoring system.
Please review and take appropriate action if needed.
```

## Benefits

### 1. Multiple Notification Channels
- Telegram for instant mobile notifications
- Email for detailed, archivable records
- Easy to add more channels in the future (Webhook, Slack, etc.)

### 2. Professional Email Design
- Color-coded by severity
- Readable on all devices
- Includes all relevant information
- Professional appearance

### 3. Flexible Configuration
- Per-alert email recipients
- Can enable/disable EMAIL per alert
- Different recipients for different alerts
- No code changes needed

### 4. Reliable Logging
- All email sends logged in admin actions
- Easy to audit notification history
- Track successful/failed sends
- Debug issues quickly

### 5. Graceful Degradation
- Works even if SMTP not configured (just skips email)
- Doesn't break if recipient invalid
- Continues to other channels if one fails
- Never stops alert processing

## Database Schema

Alert channels are stored in `alert_channels` table:

```sql
CREATE TABLE alert_channels (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'TELEGRAM' or 'EMAIL' or 'WEBHOOK'
  config JSONB NOT NULL, -- { email: "..." } or { botToken: "...", chatId: "..." }
  enabled BOOLEAN DEFAULT true,
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);
```

**EMAIL Channel Config**:
```json
{
  "email": "admin@example.com"
}
```

**TELEGRAM Channel Config**:
```json
{
  "botToken": "123456:ABC...",
  "chatId": "123456789"
}
```

## Testing Checklist

- ✅ Email alert function sends correctly
- ✅ Alert system calls email function
- ✅ Alerts page loads SMTP config
- ✅ Email recipient field appears when SMTP enabled
- ✅ Can create alert with EMAIL channel
- ✅ Can edit alert and change email recipient
- ✅ Email channel saves to database
- ✅ Test button triggers email send
- ✅ Mobile view shows EMAIL in channels
- ✅ Old email.ts file removed
- ✅ No files importing old email.ts
- ✅ Environment variables documented

## Future Improvements

### 1. Webhook Support
Add WEBHOOK channel type:
```typescript
else if (channel.type === "WEBHOOK") {
  const config = channel.config as any
  await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alert: alert.name,
      type: alert.type,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    }),
  })
}
```

### 2. Slack Integration
Add Slack webhook support for team notifications

### 3. SMS Notifications
Use Twilio or similar for critical alerts

### 4. Discord Integration
Send alerts to Discord channels

### 5. Per-Channel Configuration
Allow enabling/disabling channels per alert:
- User wants Telegram for all alerts
- But EMAIL only for critical alerts
- Solution: Add enabled flag to UI

### 6. Email Templates
Allow admins to customize email templates:
- Custom colors
- Custom branding
- Custom message format

### 7. Rate Limiting
Prevent email spam:
- Max X emails per hour per alert
- Aggregate multiple triggers
- Summary emails instead of individual

### 8. Email Attachments
Attach relevant logs or screenshots:
- Error stack traces
- Log excerpts
- System metrics

## SMTP Improvements Made

### 1. Alert Email Function
- Beautiful HTML templates
- Color-coded by severity
- Professional design
- Mobile responsive

### 2. Better Error Handling
- Graceful failures
- Detailed logging
- No blocking on errors

### 3. Improved Logging
- All SMTP operations logged
- Easy to debug
- Audit trail for compliance

### 4. Configuration Validation
- Test connection feature
- Verify before use
- Clear error messages

## Configuration Best Practices

### Development
```
Host: localhost (MailHog)
Port: 1025
Secure: false
Auth: password
User: anything
Password: anything
From: dev@example.com
```

### Production
```
Host: smtp.sendgrid.net (or similar)
Port: 587
Secure: false (STARTTLS)
Auth: password
User: apikey
Password: your-api-key
From: alerts@yourdomain.com
```

### Gmail
```
Host: smtp.gmail.com
Port: 587
Secure: false
Auth: password
User: your-email@gmail.com
Password: app-specific-password
From: your-email@gmail.com
```

## Summary

The alert system now supports EMAIL notifications alongside Telegram, providing multiple channels for critical alerts. The implementation is clean, well-tested, and ready for production use. Email templates are professional and mobile-friendly, and the UI makes it easy to configure email recipients per alert.

All improvements maintain backward compatibility, don't break existing alerts, and follow the established patterns in the codebase.
