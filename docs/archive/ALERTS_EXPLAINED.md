# Alert Rules System - Quick Guide

## What Are Alerts?

Alerts are **automated notifications** that trigger when certain conditions are met in your application. They help you monitor security threats, errors, and important events in real-time.

## How It Works

```
Application Event → Check Alert Rules → Condition Met? → Send Notification
```

For example:
1. User fails to login 5 times in a row
2. Alert rule checks: "Are there 10+ failed logins in 5 minutes?"
3. Condition is met → Send Telegram notification to admin

## Alert Page Overview

**Location**: `/admin/alerts`

The page shows a table with all your alert rules:

| Column | Description |
|--------|-------------|
| **Alert Name** | Name of the rule (e.g., "Error Spike Detected") |
| **Type** | Category - SECURITY, ERROR, WARNING, or INFO |
| **Condition** | When to trigger (e.g., "10 errors in 5 min") |
| **Status** | ON/OFF toggle switch |
| **Triggers** | How many times this alert has fired |
| **Actions** | Test, Edit, History, Delete buttons |

## Creating an Alert

**Button**: Click "**+ Create Alert**" at the top

### Step 1: Basic Information

- **Name**: Give it a clear name (e.g., "Failed Login Attempts")
- **Description**: Optional details about what it monitors
- **Type**: Choose category
  - 🔴 **SECURITY** - Security threats (failed logins, suspicious activity)
  - 🟠 **ERROR** - Application errors
  - 🟡 **WARNING** - Warnings
  - 🔵 **INFO** - General information

### Step 2: Set Condition

Choose what triggers the alert:

#### Option 1: Failed Logins
- **Threshold**: How many failed attempts (e.g., 10)
- **Time Window**: In how many minutes (e.g., 5)
- **Example**: Alert if there are 10 failed logins in 5 minutes

#### Option 2: Error Spike
- **Threshold**: How many errors (e.g., 10)
- **Time Window**: In how many minutes (e.g., 5)
- **Example**: Alert if there are 10 ERROR logs in 5 minutes

### Step 3: Notification Channels

Choose where to send alerts:

- ✅ **Telegram** - Send message to your Telegram bot
  - ⚠️ Requires: Telegram bot configured in Settings
- ⬜ **Email** - Send email (not yet implemented)
- ⬜ **Webhook** - Send to external URL (not yet implemented)

### Step 4: Enable/Disable

- Toggle the switch to enable the alert
- Disabled alerts won't trigger even if conditions are met

## Testing Alerts

After creating an alert, you should test it:

1. Click the **⚡ Test** button next to the alert
2. System will send a test notification
3. Check your Telegram to confirm you received it

**Note**: The alert must be enabled to test it.

## Default Alerts (Pre-configured)

The system comes with 2 default alerts:

### 1. Error Spike Detected
- **Type**: ERROR (🟠)
- **Condition**: 10 errors in 5 minutes
- **Purpose**: Detect when your app is having technical issues
- **Channel**: Telegram

### 2. Failed Login Attempts
- **Type**: SECURITY (🔴)
- **Condition**: 5 failed logins in 5 minutes
- **Purpose**: Detect brute-force login attacks
- **Channel**: Telegram

## How Alerts Are Triggered

Alerts are checked **automatically** by the system:

1. **Real-time monitoring**: Every time an event happens (login, error, etc.)
2. **Database query**: System counts matching events in the time window
3. **Threshold check**: If count ≥ threshold, alert fires
4. **Notification sent**: Message sent via configured channels
5. **Cooldown**: Alert won't fire again for a short period (prevents spam)

## Viewing Alert History

Click the **👁 History** button to see:

- When the alert was triggered
- What caused it (event details)
- What channels were used
- Success/failure status of notifications

This helps you:
- Understand patterns (e.g., attacks always happen at night)
- Debug notification issues
- Audit security events

## Example Use Cases

### 1. Security Monitoring
**Alert**: "Brute Force Attack Detection"
- Condition: 20 failed logins in 10 minutes
- Type: SECURITY
- Action: Investigate IP addresses, consider blocking

### 2. Application Health
**Alert**: "Critical Error Spike"
- Condition: 50 errors in 5 minutes
- Type: ERROR
- Action: Check application logs, restart services if needed

### 3. User Activity
**Alert**: "High Registration Rate"
- Condition: 100 new users in 60 minutes
- Type: INFO
- Action: Could indicate bot activity or viral growth

## Alert Notifications Format

When an alert triggers, you receive a message like:

```
🚨 SECURITY ALERT

Failed Login Attempts

Condition: 5 failed logins in 5 min
Triggered at: 2025-10-22 14:30:00
Count: 8 attempts

Recent Events:
- test1@mail.com (192.168.1.5)
- test2@mail.com (192.168.1.5)
- test3@mail.com (192.168.1.5)

Action Required: Check suspicious activity
```

## Managing Alerts

### Edit Alert
1. Click **✏️ Edit** button
2. Modify name, condition, or channels
3. Click "Update"

### Disable Alert
- Use the ON/OFF switch in the Status column
- Temporarily disables without deleting

### Delete Alert
1. Click **🗑️ Delete** button
2. Confirm deletion
3. ⚠️ Cannot be undone

## Best Practices

### 1. Set Realistic Thresholds
- ❌ Too low → Spam notifications (e.g., 1 error in 60 min)
- ❌ Too high → Miss important events (e.g., 1000 errors in 1 min)
- ✅ Just right → Balance between noise and detection

### 2. Use Appropriate Types
- **SECURITY** - Potential attacks, unauthorized access
- **ERROR** - System failures, bugs
- **WARNING** - Degraded performance, near limits
- **INFO** - Normal but noteworthy events

### 3. Test Your Alerts
- Always test new alerts to ensure notifications work
- Verify Telegram bot is configured correctly
- Check that messages are clear and actionable

### 4. Review History Regularly
- Look for patterns (time of day, specific users)
- Adjust thresholds based on actual usage
- Remove alerts that never trigger or trigger too often

### 5. Combine Multiple Channels
- Primary: Telegram (instant)
- Secondary: Email (when implemented)
- Backup: Webhook to monitoring service

## Troubleshooting

### Alert Not Triggering

**Check:**
1. ✅ Is the alert **enabled**? (ON/OFF switch)
2. ✅ Is the threshold realistic? (try lowering it temporarily)
3. ✅ Are events actually happening? (check logs)
4. ✅ Is the time window correct? (5 min vs 60 min makes a big difference)

### Notifications Not Arriving

**Check:**
1. ✅ Is Telegram bot configured? (Settings → Telegram Bot Configuration)
2. ✅ Is bot token valid?
3. ✅ Is chat ID correct?
4. ✅ Did you test the Telegram connection? (Settings → Test Connection)
5. ✅ Check alert history for error messages

### Too Many Notifications

**Solutions:**
1. Increase threshold (e.g., 10 → 20 errors)
2. Increase time window (e.g., 5 min → 15 min)
3. Disable noisy alerts temporarily
4. Add cooldown logic (future feature)

## Technical Details

### Where Alerts Are Stored

**Database Table**: `AlertRule`

```prisma
model AlertRule {
  id          String   // Unique ID
  name        String   // Alert name
  description String?  // Optional description
  type        String   // SECURITY, ERROR, WARNING, INFO
  condition   Json     // Condition configuration
  enabled     Boolean  // ON/OFF status
  channels    AlertChannel[]  // Notification channels
  triggers    AlertTrigger[]  // History of triggers
}
```

### How Conditions Work

Conditions are stored as JSON:

**Failed Logins Example:**
```json
{
  "type": "failed_logins",
  "threshold": 10,
  "timeWindow": 5
}
```

**Error Spike Example:**
```json
{
  "type": "error_spike",
  "threshold": 10,
  "timeWindow": 5
}
```

### Alert Evaluation Logic

When checking if an alert should trigger:

```typescript
// Get events in time window
const cutoff = new Date(Date.now() - timeWindow * 60 * 1000)

const eventCount = await prisma.sessionLog.count({
  where: {
    success: false,
    timestamp: { gte: cutoff }
  }
})

// Trigger if threshold exceeded
if (eventCount >= threshold) {
  await sendNotification(alert)
}
```

## Future Enhancements

The following features are planned:

- [ ] **Email notifications** - Send alerts via email
- [ ] **Webhook support** - Send to external services (Slack, Discord, PagerDuty)
- [ ] **Alert cooldown** - Prevent duplicate alerts in short time
- [ ] **Alert groups** - Combine related alerts
- [ ] **Custom conditions** - More flexible condition builders
- [ ] **Alert escalation** - Send to different channels based on severity
- [ ] **Scheduled reports** - Daily/weekly summaries
- [ ] **Alert templates** - Pre-configured alert sets
- [ ] **Multi-channel routing** - Different alerts to different channels

## Quick Reference

| Task | Action |
|------|--------|
| Create alert | Click "+ Create Alert" |
| Edit alert | Click ✏️ Edit button |
| Delete alert | Click 🗑️ Delete button |
| Enable/disable | Toggle ON/OFF switch |
| Test alert | Click ⚡ Test button |
| View history | Click 👁 History button |
| Configure Telegram | Settings → Telegram Bot Configuration |

## Related Documentation

- [Telegram Bot Setup](../app/admin/settings/page.tsx) - Configure notification channel
- [System Logs](../app/admin/logs/page.tsx) - View events that trigger alerts
- [Cron Jobs](../app/admin/cron/page.tsx) - Scheduled tasks that might trigger alerts

## Need Help?

If alerts aren't working as expected:

1. Check the alert history for error messages
2. Verify Telegram bot is working (Settings → Test Connection)
3. Review system logs for related events
4. Test with a lower threshold temporarily
5. Check the database for `AlertRule` and `AlertTrigger` entries
