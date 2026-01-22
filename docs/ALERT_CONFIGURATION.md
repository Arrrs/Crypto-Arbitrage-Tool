# Alert Notifications Configuration Guide

Complete guide to configure email and Telegram alerts for your application.

**Last Updated**: November 1, 2025

---

## Table of Contents

1. [Email Alerts Setup](#email-alerts-setup)
2. [Telegram Alerts Setup](#telegram-alerts-setup)
3. [Testing Alerts](#testing-alerts)
4. [Alert Types](#alert-types)
5. [Troubleshooting](#troubleshooting)

---

## Email Alerts Setup

### Option 1: Gmail (Recommended for Testing)

#### Step 1: Enable 2FA on Gmail

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Follow the setup wizard

#### Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter name: "WebApp Alerts"
5. Click "Generate"
6. Copy the 16-character password (no spaces)

#### Step 3: Configure .env

```env
# Email Alerts
EMAIL_ENABLED="true"
ALERT_EMAIL="youremail@gmail.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="youremail@gmail.com"
SMTP_PASS="abcd efgh ijkl mnop"  # App password from step 2
```

### Option 2: SendGrid (Recommended for Production)

#### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for free tier (100 emails/day)
3. Verify your email

#### Step 2: Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name: "WebApp Alerts"
4. Permissions: "Full Access"
5. Copy the API key (starts with "SG.")

#### Step 3: Configure .env

```env
# Email Alerts via SendGrid
EMAIL_ENABLED="true"
ALERT_EMAIL="admin@yourdomain.com"
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"  # Literally "apikey"
SMTP_PASS="SG.your-api-key-here"
```

### Option 3: AWS SES (Production Scale)

#### Step 1: Set Up SES

1. Go to AWS Console → SES
2. Verify your domain or email
3. Request production access (if needed)
4. Create SMTP credentials

#### Step 2: Configure .env

```env
# Email Alerts via AWS SES
EMAIL_ENABLED="true"
ALERT_EMAIL="admin@yourdomain.com"
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
```

### Option 4: Custom SMTP Server

```env
# Email Alerts via Custom SMTP
EMAIL_ENABLED="true"
ALERT_EMAIL="admin@yourdomain.com"
SMTP_HOST="mail.yourdomain.com"
SMTP_PORT="587"
SMTP_USER="alerts@yourdomain.com"
SMTP_PASS="your-password"
```

---

## Telegram Alerts Setup

### Step 1: Create Telegram Bot

1. **Open Telegram** (mobile or desktop app)

2. **Talk to BotFather**:
   - Search for `@BotFather` in Telegram
   - Start conversation: `/start`
   - Create new bot: `/newbot`

3. **Follow the prompts**:
   ```
   You: /newbot
   BotFather: Alright, a new bot. How are we going to call it?
   You: WebApp Alerts Bot
   BotFather: Good. Now let's choose a username for your bot.
   You: webapp_alerts_bot
   ```

4. **Save Bot Token**:
   ```
   BotFather: Done! Here's your bot token:
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
   Copy this token - you'll need it for `.env`

### Step 2: Get Your Chat ID

#### For Personal Alerts

1. **Talk to your bot**:
   - Search for your bot username (e.g., `@webapp_alerts_bot`)
   - Click "Start"
   - Send any message: "Hello"

2. **Get Chat ID**:
   - Search for `@userinfobot`
   - Start conversation: `/start`
   - It will show your ID: `Your ID: 123456789`
   - Copy this number

#### For Group Alerts

1. **Create/Use Telegram Group**:
   - Create a new group or use existing one
   - Name it: "WebApp Alerts"

2. **Add Your Bot to Group**:
   - Add your bot as member
   - Bot username: `@webapp_alerts_bot`

3. **Make Bot Admin** (optional but recommended):
   - Group settings → Administrators
   - Add your bot as administrator

4. **Get Group Chat ID**:

   Method 1 - Using @userinfobot:
   - Add `@userinfobot` to the group
   - It will show the group ID: `Chat ID: -1001234567890`
   - Remove @userinfobot after getting ID

   Method 2 - Using API:
   ```bash
   # Replace YOUR_BOT_TOKEN with your actual token
   curl https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
   - Send a message to the group
   - Run the curl command
   - Look for `"chat":{"id":-1001234567890`
   - Copy the ID (including the minus sign!)

### Step 3: Configure .env

```env
# Telegram Alerts
TELEGRAM_ENABLED="true"
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_CHAT_ID="123456789"  # Personal
# or
TELEGRAM_CHAT_ID="-1001234567890"  # Group (note the minus sign!)
```

### Step 4: Test Telegram Bot

```bash
# Test sending a message
curl -X POST "https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/sendMessage" \
  -d "chat_id=123456789" \
  -d "text=Test message from WebApp"
```

Replace:
- `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` with your bot token
- `123456789` with your chat ID

---

## Testing Alerts

### Test Alert Script

```bash
# From project root
/usr/local/bin/send-alert.sh "Test alert message" "INFO"
```

This will:
- ✅ Send email (if EMAIL_ENABLED=true)
- ✅ Send Telegram message (if TELEGRAM_ENABLED=true)
- ✅ Log to /var/log/webapp/alerts.log

### Test Individual Components

#### Test Email Only

```bash
# Install mail utils if not present
sudo apt-get install mailutils

# Send test email
echo "Test email from WebApp" | mail -s "Test Alert" admin@yourdomain.com
```

#### Test Telegram Only

```bash
# Replace with your values
BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
CHAT_ID="123456789"

curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
  -d "chat_id=$CHAT_ID" \
  -d "text=🔔 Test alert from WebApp" \
  -d "parse_mode=HTML"
```

### Monitor Test Results

```bash
# Check alert logs
tail -f /var/log/webapp/alerts.log

# Check system logs for email errors
tail -f /var/log/mail.log

# Check monitoring logs
tail -f /var/log/webapp/system-monitor.log
```

---

## Alert Types

### Automatic Alerts

These alerts are sent automatically when thresholds are exceeded:

#### 1. System Resource Alerts

**Triggered when**:
- Disk usage > 80%
- CPU usage > 90%
- Memory usage > 90%

**Frequency**: Every 15 minutes (via cron)

**Example Telegram Message**:
```
⚠️ WARNING: Disk usage is 85% (threshold: 80%)
Server: webapp-prod-01
Time: 2025-11-01 22:15:00
```

**Example Email**:
```
Subject: [WARNING] WebApp Alert - Disk Usage High

Disk usage is 85% (threshold: 80%)
Server: webapp-prod-01
Time: 2025-11-01 22:15:00

Please investigate and free up disk space.
```

#### 2. Application Health Alerts

**Triggered when**:
- Health endpoint returns non-200 status
- Database connection fails
- Application not responding

**Frequency**: Every 5 minutes (via cron)

**Example Message**:
```
❌ Application health check failed (HTTP 503)
Endpoint: https://yourdomain.com/api/health
Time: 2025-11-01 22:15:00
```

#### 3. Backup Alerts

**Triggered when**:
- Backup fails
- Backup verification fails

**Frequency**: After each backup (daily at 2 AM)

**Example Message**:
```
❌ ERROR: Failed to create backup
Database: webapp_prod
Error: Connection timeout
Time: 2025-11-01 02:00:00
```

### Manual Alerts

Send custom alerts from your application:

```bash
# Info alert
/usr/local/bin/send-alert.sh "Deployment completed successfully" "INFO"

# Warning alert
/usr/local/bin/send-alert.sh "High memory usage detected" "WARNING"

# Critical alert
/usr/local/bin/send-alert.sh "Database backup failed" "CRITICAL"
```

### Alert Severity Levels

| Level | Icon | Use Case | Example |
|-------|------|----------|---------|
| INFO | ℹ️ | General information | "Backup completed successfully" |
| WARNING | ⚠️ | Potential issues | "Disk usage at 85%" |
| CRITICAL | ❌ | Urgent issues | "Database connection failed" |

---

## Advanced Configuration

### Custom Alert Format

Edit `/usr/local/bin/send-alert.sh` to customize message format:

```bash
# Telegram with custom formatting
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=<b>[$ALERT_LEVEL]</b> WebApp Alert

<i>$ALERT_MESSAGE</i>

🕒 Time: $(date '+%Y-%m-%d %H:%M:%S')
🖥 Server: $(hostname)
📊 Uptime: $(uptime -p)" \
  -d "parse_mode=HTML"
```

### Alert Throttling

Prevent alert spam by adding throttling:

```bash
# Create throttle check
THROTTLE_FILE="/tmp/alert-throttle-$(echo "$ALERT_MESSAGE" | md5sum | cut -d' ' -f1)"
THROTTLE_MINUTES=30

if [ -f "$THROTTLE_FILE" ]; then
    LAST_ALERT=$(stat -c %Y "$THROTTLE_FILE")
    NOW=$(date +%s)
    DIFF=$((NOW - LAST_ALERT))

    if [ $DIFF -lt $((THROTTLE_MINUTES * 60)) ]; then
        echo "Alert throttled (sent $DIFF seconds ago)"
        exit 0
    fi
fi

# Send alert...

# Update throttle file
touch "$THROTTLE_FILE"
```

### Multiple Recipients

#### Email - Multiple Recipients

```env
# Comma-separated emails
ALERT_EMAIL="admin@domain.com,ops@domain.com,alerts@domain.com"
```

#### Telegram - Multiple Chats

Edit `/usr/local/bin/send-alert.sh`:

```bash
# Multiple chat IDs
TELEGRAM_CHAT_IDS=("123456789" "-1001234567890" "987654321")

for CHAT_ID in "${TELEGRAM_CHAT_IDS[@]}"; do
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$CHAT_ID" \
        -d "text=[$ALERT_LEVEL] $ALERT_MESSAGE"
done
```

---

## Troubleshooting

### Email Alerts Not Working

#### Check 1: SMTP Configuration

```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# If connection fails, check firewall
sudo ufw status | grep 587
```

#### Check 2: Authentication

```bash
# Check mail logs
tail -f /var/log/mail.log

# Common errors:
# - "Authentication failed" → Wrong username/password
# - "Connection refused" → SMTP port blocked
# - "Relay access denied" → SMTP server doesn't allow relay
```

#### Check 3: Email Settings

```bash
# Verify .env settings are loaded
cat .env | grep EMAIL
cat .env | grep SMTP

# Common issues:
# - EMAIL_ENABLED="false" (should be "true")
# - Wrong SMTP_PORT (587 for TLS, 465 for SSL)
# - App password with spaces (should have no spaces)
```

### Telegram Alerts Not Working

#### Check 1: Bot Token

```bash
# Test bot token
BOT_TOKEN="your-bot-token"
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# Expected response:
{"ok":true,"result":{"id":123456789,"is_bot":true,"first_name":"WebApp Alerts Bot"}}

# If error:
{"ok":false,"error_code":401,"description":"Unauthorized"}
# → Wrong bot token
```

#### Check 2: Chat ID

```bash
# Verify chat ID
BOT_TOKEN="your-bot-token"
CHAT_ID="your-chat-id"

curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
  -d "chat_id=$CHAT_ID" \
  -d "text=Test message"

# If error 400 "Bad Request: chat not found"
# → Wrong chat ID or bot not started/added to group
```

#### Check 3: Common Issues

| Issue | Solution |
|-------|----------|
| "Bot not started" | Send /start to the bot first |
| "Chat not found" | Verify chat ID is correct |
| "Bot blocked by user" | Unblock the bot in Telegram |
| "Not enough rights" | Make bot admin in group (for groups) |
| "Wrong chat ID format" | Group IDs start with `-100`, personal IDs don't have `-` |

### General Debugging

```bash
# Check if monitoring scripts are running
crontab -l

# Check cron execution logs
grep CRON /var/log/syslog

# Manually run alert script with debug
bash -x /usr/local/bin/send-alert.sh "Test" "INFO"

# Check alert logs
tail -100 /var/log/webapp/alerts.log
```

---

## Production Best Practices

### 1. Use Dedicated Alert Email

```env
# Instead of personal email
ALERT_EMAIL="alerts@yourdomain.com"

# Set up email forwarding to team
# alerts@yourdomain.com → admin@domain.com, ops@domain.com
```

### 2. Use Dedicated Telegram Group

```
Group Name: "WebApp Production Alerts"
Members: DevOps team, SRE team, On-call engineers
Bot: @webapp_alerts_bot (as admin)
```

### 3. Configure Alert Routing

Different alerts to different channels:

```bash
# Critical alerts → Telegram (immediate)
if [ "$ALERT_LEVEL" = "CRITICAL" ]; then
    send_telegram_alert "$ALERT_MESSAGE"
fi

# Warning/Info → Email (daily digest)
if [ "$ALERT_LEVEL" = "WARNING" ] || [ "$ALERT_LEVEL" = "INFO" ]; then
    send_email_alert "$ALERT_MESSAGE"
fi
```

### 4. Set Up PagerDuty Integration (Optional)

For 24/7 on-call alerting:

1. Sign up at https://pagerduty.com
2. Create service integration
3. Add to alert script:

```bash
# PagerDuty webhook
PAGERDUTY_KEY="your-integration-key"

if [ "$ALERT_LEVEL" = "CRITICAL" ]; then
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
      -H "Content-Type: application/json" \
      -d "{
        \"routing_key\": \"$PAGERDUTY_KEY\",
        \"event_action\": \"trigger\",
        \"payload\": {
          \"summary\": \"$ALERT_MESSAGE\",
          \"severity\": \"critical\",
          \"source\": \"webapp\"
        }
      }"
fi
```

---

## Configuration Checklist

### Email Setup

- [ ] Choose email provider (Gmail/SendGrid/SES/Custom)
- [ ] Create app password or API key
- [ ] Configure SMTP settings in `.env`
- [ ] Set `EMAIL_ENABLED="true"`
- [ ] Test with: `/usr/local/bin/send-alert.sh "Test" "INFO"`
- [ ] Verify email received
- [ ] Check spam folder if not received

### Telegram Setup

- [ ] Create bot with @BotFather
- [ ] Copy bot token
- [ ] Get chat ID (personal or group)
- [ ] Configure settings in `.env`
- [ ] Set `TELEGRAM_ENABLED="true"`
- [ ] Test with curl command
- [ ] Verify message received
- [ ] Add bot to group (if using group alerts)

### Monitoring Integration

- [ ] Alerts configured in `.env`
- [ ] Monitoring scripts installed
- [ ] Cron jobs running
- [ ] Test alerts working
- [ ] Logs being written to `/var/log/webapp/`
- [ ] Alert throttling configured (if needed)
- [ ] Multiple recipients configured (if needed)

---

**Alert Configuration Complete!** 🔔

You now have:
- ✅ Email alerts configured
- ✅ Telegram alerts configured
- ✅ Automatic monitoring alerts
- ✅ Manual alert capability
- ✅ Multiple severity levels
- ✅ Comprehensive logging

**Next Step**: [Set up UptimeRobot](./UPTIMEROBOT_SETUP.md)
