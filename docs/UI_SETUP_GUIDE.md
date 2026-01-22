# Complete UI Setup Guide

Everything you need to configure through the Admin UI - **no terminal commands needed!**

**Date**: November 1, 2025
**Time to Complete**: ~10 minutes

---

## Overview

Your application already has a **complete admin UI** for:
- ✅ Email & Telegram notifications
- ✅ Cron job management
- ✅ System settings
- ✅ Analytics configuration
- ✅ All monitoring features

**No need to run scripts in the console!** Everything is in the UI.

---

## Step 1: Access Admin Panel

1. **Login to your application**:
   ```
   http://localhost:3000/login
   ```

2. **Login with admin account**:
   - Email: Your admin email
   - Password: Your admin password

3. **Navigate to Settings**:
   ```
   Sidebar → Settings
   or
   http://localhost:3000/admin/settings
   ```

---

## Step 2: Configure Email Notifications (Option 1)

### Using Gmail

1. **Expand "📧 SMTP/Email Configuration"** section

2. **Generate Gmail App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other" (enter "WebApp Alerts")
   - Click "Generate"
   - Copy the 16-character password (no spaces!)

3. **Fill in the form**:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   Use TLS/SSL: OFF (already using STARTTLS on port 587)
   Authentication Method: password
   Username: youremail@gmail.com
   Password: [paste your app password]
   From Address: youremail@gmail.com
   Enable email notifications: ON
   ```

4. **Click "Test Email Connection"**:
   - You should receive a test email
   - If you get an error, check your app password

5. **Click "Save Configuration"**

6. **Enable Email Alerts**:
   - Expand "⚡ Feature Flags" section
   - Toggle "Email Alerts" to ON
   - Click "Save Features"

**Done!** ✅ Email notifications are now active.

---

## Step 3: Configure Telegram Notifications (Option 2)

### Create Telegram Bot

1. **Open Telegram** (mobile or desktop)

2. **Talk to @BotFather**:
   - Search for `@BotFather`
   - Start chat: `/start`
   - Create bot: `/newbot`
   - Follow prompts:
     ```
     You: /newbot
     BotFather: Alright, a new bot. How are we going to call it?
     You: WebApp Alerts
     BotFather: Good. Now let's choose a username for your bot.
     You: webapp_alerts_bot
     BotFather: Done! Here's your bot token:
     123456789:ABCdefGHIjklMNOpqrsTUVwxyz
     ```
   - **Copy the bot token**

3. **Get your Chat ID**:
   - Search for `@userinfobot` in Telegram
   - Start chat: `/start`
   - Copy your ID (example: `123456789`)

4. **Start your bot**:
   - Search for your bot (e.g., `@webapp_alerts_bot`)
   - Click "Start"
   - Send a test message: "Hello"

### Configure in UI

1. **In your app, expand "🔔 Telegram Bot Configuration"**

2. **Fill in the form**:
   ```
   Bot Token: [paste your bot token from @BotFather]
   Chat ID: [paste your chat ID from @userinfobot]
   Enable Telegram notifications: ON
   ```

3. **Click "Test Connection"**:
   - You should receive a message in Telegram
   - Message will say: "Test message from WebApp"

4. **Click "Save Configuration"**

5. **Enable Telegram Alerts**:
   - Expand "⚡ Feature Flags" section
   - Toggle "Telegram Alerts" to ON
   - Click "Save Features"

**Done!** ✅ Telegram notifications are now active.

---

## Step 4: Check Cron Jobs

1. **Navigate to Cron Jobs page**:
   ```
   Sidebar → Cron Jobs
   or
   http://localhost:3000/admin/cron
   ```

2. **You should see 8 active cron jobs**:

   | Job Name | Schedule | Status | Description |
   |----------|----------|--------|-------------|
   | System Health Check | Every 15 min | ✅ Running | Monitors disk, CPU, memory |
   | Log Cleanup | Daily 2 AM | ✅ Running | Cleans old logs |
   | Analytics Refresh | Every 6 hours | ✅ Running | Updates analytics cache |
   | Analytics Cleanup | Daily 3 AM | ✅ Running | Removes old analytics data |
   | Hourly Stats | Every hour | ✅ Running | Aggregates hourly metrics |
   | Feature Usage | Daily 2 AM | ✅ Running | Tracks feature usage |
   | Daily Stats | Daily 1 AM | ✅ Running | Aggregates daily metrics |
   | Check Alerts | Every 5 min | ✅ Running | Monitors system health |

3. **All jobs should show**:
   - ✅ Enabled
   - 🟢 Last run: [timestamp]
   - 📅 Next run: [timestamp]

4. **To manually trigger a job**:
   - Find the job in the list
   - Click "▶ Run Now" button
   - Wait for execution to complete
   - Check "Last Status" - should show "SUCCESS"

5. **To view execution history**:
   - Click on the job name
   - View recent executions
   - Check for errors or failures

---

## Step 5: Configure System Settings (Optional)

### Log Retention Policy

1. **Expand "📁 Log Retention Policy"** section

2. **Configure retention periods**:
   ```
   Audit Logs: 90 days (recommended)
   Session Logs: 30 days
   Application Logs: 30 days
   Rate Limit Logs: 7 days
   ```

3. **Click "Save Policy"**

### System Limits

1. **Expand "⚙️ System Limits"** section

2. **Configure limits** (defaults are fine):
   ```
   Max File Upload Size: 5 MB
   Max Avatar Size: 2 MB
   Rate Limit Per Minute: 60
   Max Login Attempts: 5
   Session Timeout: 60 minutes
   ```

3. **Click "Save Limits"**

### Analytics Settings

1. **Expand "📊 Analytics Settings"** section

2. **Enable tracking** (optional):
   - Page Views: ON (if you want to track page visits)
   - User Activity: ON (if you want to track user actions)
   - Device Info: ON (if you want browser/device stats)
   - Geolocation: ON (if you want country/city data)
   - Subscription Events: ON (if you use paid subscriptions)
   - Performance: OFF (unless you need response time tracking)

3. **Configure performance**:
   ```
   Sampling Rate: 100% (track all events)
   Batch Size: 100 (default is fine)
   Async Tracking: ON (recommended)
   ```

4. **Configure retention**:
   ```
   Raw Data Retention: 90 days
   Aggregated Data Retention: 365 days
   ```

5. **Click "Save Analytics Settings"**

---

## Step 6: Add Metabase Dashboards (Optional)

If you're using Metabase for analytics:

1. **In Analytics Settings, scroll to "Metabase Dashboards"**

2. **Click "Add Dashboard Link"**

3. **Fill in dashboard details**:
   ```
   Title: User Analytics
   Description: User growth and engagement metrics
   URL: http://localhost:3001/dashboard/1
   ```

4. **Add more dashboards** (repeat for each):
   - Revenue Dashboard
   - System Health Dashboard
   - User Behavior Dashboard

5. **Click "Save Analytics Settings"**

6. **View dashboards**:
   - Navigate to: Analytics page
   - Click on dashboard buttons to open Metabase

---

## Step 7: Test Notifications

### Test Email

1. **Go to Settings → SMTP/Email Configuration**

2. **Click "Test Email Connection"**

3. **Check your email inbox**:
   - Subject: "Test Email"
   - From: Your configured "from" address
   - Should arrive within 1 minute

4. **If test fails**:
   - Check SMTP settings are correct
   - For Gmail, verify app password (no spaces!)
   - Check spam folder
   - Try port 465 with TLS/SSL enabled

### Test Telegram

1. **Go to Settings → Telegram Bot Configuration**

2. **Click "Test Connection"**

3. **Check Telegram app**:
   - Message from your bot
   - Content: "Test message from WebApp"
   - Should arrive within 10 seconds

4. **If test fails**:
   - Verify bot token is correct
   - Verify chat ID is correct
   - Ensure you've started the bot (sent /start)
   - Check bot hasn't been blocked

---

## Step 8: Verify Monitoring is Working

### System Health Monitoring

The "Check Alerts" cron job runs every 5 minutes and automatically sends alerts when:
- Disk usage > 80%
- CPU usage > 90%
- Memory usage > 90%
- Application health check fails
- Database connection fails

**To verify it's working**:

1. **Check cron job execution**:
   - Navigate to Cron Jobs page
   - Find "Check Alerts" job
   - Verify "Last Status" is SUCCESS
   - Verify "Last Run" is recent (< 5 min ago)

2. **Trigger a test alert** (optional):
   - Fill disk to >80% (not recommended in production!)
   - Or wait for a natural alert condition
   - You'll receive email/Telegram notification

### Health Endpoint

1. **Test health endpoint**:
   ```
   http://localhost:3000/api/health
   ```

2. **Expected response**:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-11-01T22:00:00.000Z",
     "uptime": 86400,
     "database": "connected",
     "responseTime": "15ms",
     "version": "1.0.0",
     "environment": "development"
   }
   ```

3. **This endpoint is used by**:
   - Internal monitoring (every 5 min)
   - UptimeRobot (external monitoring)
   - Load balancers (health checks)

---

## Common Tasks - UI Edition

### How to: Change Email Settings

1. Navigate to Settings
2. Expand "📧 SMTP/Email Configuration"
3. Update fields
4. Click "Save Configuration"
5. ✅ Done - no restart needed!

### How to: Disable Telegram Alerts Temporarily

1. Navigate to Settings
2. Expand "⚡ Feature Flags"
3. Toggle "Telegram Alerts" to OFF
4. Click "Save Features"
5. ✅ Alerts disabled instantly

### How to: Check if Cron Jobs are Running

1. Navigate to Cron Jobs page
2. Look for "Last Run" timestamps
3. All should show < 1 day ago
4. Status should be "SUCCESS"

### How to: Manually Run a Cron Job

1. Navigate to Cron Jobs page
2. Find the job
3. Click "▶ Run Now"
4. Wait for completion
5. Check "Last Status"

### How to: View Cron Job Execution History

1. Navigate to Cron Jobs page
2. Click on job name
3. View execution history table
4. Check for failures/errors
5. View execution duration

### How to: Change Log Retention

1. Navigate to Settings
2. Expand "📁 Log Retention Policy"
3. Adjust days for each log type
4. Click "Save Policy"
5. ✅ Cleanup cron will use new values

---

## Troubleshooting - UI Edition

### Email Test Fails

**Error**: "Failed to send email"

**Solutions**:
1. Check SMTP settings in Settings UI
2. For Gmail:
   - Use app password (not regular password)
   - App password should have no spaces
   - Port should be 587
   - TLS/SSL should be OFF
3. Check spam folder
4. Try "Test Email Connection" again

### Telegram Test Fails

**Error**: "Failed to send message"

**Solutions**:
1. Verify bot token format: `123456789:ABCdef...`
2. Verify chat ID is just numbers: `123456789`
3. Make sure you've sent `/start` to your bot
4. Check you haven't blocked the bot
5. Try creating a new bot with @BotFather

### Cron Jobs Not Running

**Symptom**: "Last Run" is old (> 1 day)

**Check**:
1. Go to Cron Jobs page
2. Check if job is "Enabled"
3. If disabled, click "Enable" button
4. Click "▶ Run Now" to test
5. Check "Last Status" for errors

### Notifications Not Arriving

**Symptom**: No emails/Telegram messages

**Check**:
1. Go to Settings → Feature Flags
2. Verify "Email Alerts" or "Telegram Alerts" is ON
3. Go to Settings → SMTP or Telegram config
4. Verify "Enable" toggle is ON
5. Click "Test Connection"
6. If test works but alerts don't:
   - Check cron jobs are running
   - Wait for next monitoring cycle (5-15 min)

---

## Quick Reference

### Admin Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/admin` | Overview & stats |
| Settings | `/admin/settings` | Email, Telegram, system config |
| Cron Jobs | `/admin/cron` | View & manage scheduled jobs |
| Users | `/admin/users` | User management |
| Logs | `/admin/logs` | View audit, session, app logs |
| Analytics | `/admin/analytics` | View analytics dashboard |

### Settings Sections

| Section | What It Does |
|---------|--------------|
| 🔔 Telegram | Configure Telegram bot for notifications |
| 📧 SMTP/Email | Configure email server for notifications |
| ⚡ Feature Flags | Enable/disable Telegram & Email alerts |
| 📁 Log Retention | Configure how long to keep logs |
| ⚙️ System Limits | Configure upload sizes, rate limits |
| 📊 Analytics | Configure what data to track |

### Cron Jobs

| Job | Runs | Does |
|-----|------|------|
| System Health Check | Every 15 min | Monitors resources, sends alerts |
| Check Alerts | Every 5 min | Checks app health, database |
| Log Cleanup | Daily 2 AM | Deletes old logs |
| Analytics Refresh | Every 6 hours | Updates analytics cache |

---

## Summary

### What You Can Do in the UI (No Terminal!)

✅ **Configure Email Notifications**
- SMTP settings
- Test email connection
- Enable/disable email alerts

✅ **Configure Telegram Notifications**
- Bot token & chat ID
- Test Telegram connection
- Enable/disable Telegram alerts

✅ **Manage Cron Jobs**
- View all scheduled jobs
- Manually run jobs
- View execution history
- Enable/disable jobs
- Check job status

✅ **System Configuration**
- Log retention policies
- System limits (upload size, rate limits)
- Analytics tracking settings
- Metabase dashboard links

✅ **Monitoring**
- View cron job execution status
- Check health endpoint
- Receive alerts via Email/Telegram

### What Still Requires Terminal

Very minimal! Only these need terminal:

1. **Initial Setup** (one-time):
   - Install dependencies: `npm install`
   - Run migrations: `npx prisma migrate deploy`
   - Start app: `npm run dev` or `docker-compose up`

2. **Server Management** (rare):
   - Start/stop application
   - View server logs
   - Database backups (can be automated via cron)

3. **Infrastructure Setup** (one-time):
   - Firewall configuration
   - SSL certificate setup
   - Server deployment

**Everything else is in the UI!** 🎉

---

## Next Steps

1. ✅ Configure Email OR Telegram (or both) in Settings
2. ✅ Test notifications with "Test Connection" buttons
3. ✅ Enable alerts in Feature Flags
4. ✅ Check Cron Jobs are running
5. ✅ Set up UptimeRobot for external monitoring (separate service)
6. ✅ You're done!

---

**UI Setup Complete!** 🎉

Your application has a **complete admin UI** - no need to touch the terminal for day-to-day operations!

All monitoring, alerts, and system configuration can be done through the beautiful Ant Design UI.

---

**Last Updated**: November 1, 2025
