# UptimeRobot External Monitoring Setup

Complete guide to set up external uptime monitoring with UptimeRobot (free tier).

**Last Updated**: November 1, 2025
**Setup Time**: ~10 minutes

---

## Table of Contents

1. [Why External Monitoring?](#why-external-monitoring)
2. [UptimeRobot Setup](#uptimerobot-setup)
3. [Alternative Services](#alternative-services)
4. [Integration with Alerts](#integration-with-alerts)
5. [Monitoring Best Practices](#monitoring-best-practices)

---

## Why External Monitoring?

### Internal vs External Monitoring

| Type | Examples | Pros | Cons |
|------|----------|------|------|
| **Internal** | Cron jobs, local scripts | Fast, detailed | Dies with server |
| **External** | UptimeRobot, Pingdom | Independent, reliable | Limited checks |

**Best Practice**: Use both!
- **Internal**: Detailed health checks (every 5 min)
- **External**: Basic uptime monitoring (every 5 min)
- **Combined**: If external fails, server is down. If internal fails, app is broken.

### What External Monitoring Detects

- ✅ Server completely offline
- ✅ Network issues
- ✅ DNS problems
- ✅ SSL certificate expiration
- ✅ High response times
- ❌ Database issues (only if health endpoint checks it)
- ❌ Detailed application errors (use Sentry for this)

---

## UptimeRobot Setup

### Step 1: Create Account

1. Go to https://uptimerobot.com
2. Click "Free Sign Up"
3. Enter email and password
4. Verify email

**Free Tier Includes**:
- ✅ 50 monitors
- ✅ 5-minute check intervals
- ✅ Unlimited alert contacts
- ✅ Public status pages
- ✅ SSL monitoring
- ✅ HTTP(s), Ping, Port monitoring

### Step 2: Add Health Check Monitor

1. **Click "Add New Monitor"**

2. **Monitor Type**: HTTP(s)
   - Most versatile option
   - Checks both uptime and health endpoint response

3. **Friendly Name**: `WebApp Health Check`
   - Use descriptive names
   - Example: "Production API Health", "Staging Server"

4. **URL**: `https://yourdomain.com/api/health`
   - Replace with your actual domain
   - Must use HTTPS in production
   - Development: `http://yourdomain.com/api/health`

5. **Monitoring Interval**: 5 minutes
   - Free tier: Every 5 minutes
   - Paid tier: Down to 1 minute

6. **Monitor Timeout**: 30 seconds
   - Default is fine for most apps
   - Increase if your health check is slow

7. **HTTP Method**: GET
   - Our health endpoint supports GET

8. **Advanced Settings** (expand):

   **Keyword Monitoring** (recommended):
   - ✅ Enable keyword monitoring
   - Keyword Type: "Exists"
   - Keyword: `"status":"ok"`
   - This ensures the response is actually healthy, not just returning 200

   **Expected Status Code**:
   - ✅ Enable
   - Status Code: `200`

   **Custom HTTP Headers** (if needed):
   - Usually not needed for public health endpoints
   - Add if you have auth requirements

9. **Click "Create Monitor"**

### Step 3: Add Main Website Monitor

1. **Click "Add New Monitor"**

2. **Monitor Type**: HTTP(s)

3. **Friendly Name**: `WebApp Homepage`

4. **URL**: `https://yourdomain.com`

5. **Monitoring Interval**: 5 minutes

6. **Advanced Settings**:
   - Keyword: Your site title or unique text
   - Example: `"WebApp"` or `"Welcome"`

7. **Click "Create Monitor"**

### Step 4: Add SSL Certificate Monitor

1. **Click "Add New Monitor"**

2. **Monitor Type**: HTTP(s)
   - Will check SSL as part of HTTPS check

3. **Friendly Name**: `WebApp SSL Certificate`

4. **URL**: `https://yourdomain.com`

5. **Advanced Settings**:
   - ✅ SSL Expiry Reminder: 30 days
   - Get notified 30 days before SSL expires

6. **Click "Create Monitor"**

### Step 5: Add Database Monitor (Optional)

Only if your database is accessible externally (usually not recommended).

1. **Monitor Type**: Port

2. **Friendly Name**: `Database Port`

3. **Host**: Your database server IP

4. **Port**: `5432` (PostgreSQL)

5. **Click "Create Monitor"**

---

## Configure Alert Contacts

### Step 1: Add Email Contact

1. Go to **"My Settings" → "Alert Contacts"**

2. Click **"Add Alert Contact"**

3. **Alert Contact Type**: Email

4. **Friendly Name**: `Primary Email`

5. **Email Address**: `admin@yourdomain.com`

6. Click **"Create Alert Contact"**

### Step 2: Add SMS Contact (Optional - Paid)

1. **Alert Contact Type**: SMS

2. **Phone Number**: Your number with country code
   - Example: `+1234567890`

3. Click **"Create Alert Contact"**

### Step 3: Add Telegram Contact

1. **Create Telegram Bot** (if not already done):
   - Talk to @BotFather
   - Create bot: `/newbot`
   - Get bot token

2. **Get Chat ID**:
   - Talk to @userinfobot
   - Copy your chat ID

3. **In UptimeRobot**:
   - Alert Contact Type: Webhook
   - Friendly Name: `Telegram`
   - URL: `https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage?chat_id=YOUR_CHAT_ID&text=Alert`
   - Replace YOUR_BOT_TOKEN and YOUR_CHAT_ID

### Step 4: Add Slack Contact (Optional)

1. **Create Slack Webhook**:
   - Go to https://api.slack.com/apps
   - Create app → From scratch
   - Enable "Incoming Webhooks"
   - Add webhook to channel
   - Copy webhook URL

2. **In UptimeRobot**:
   - Alert Contact Type: Webhook
   - URL: Your Slack webhook URL
   - Method: POST
   - Post Value (Custom): `{"text":"*monitorFriendlyName* is *alertTypeFriendlyName*"}`

### Step 5: Configure Alert Preferences

1. **For each monitor**, click **"Edit"**

2. Scroll to **"Alert Contacts To Notify"**

3. Select contacts:
   - ✅ Primary Email (all alerts)
   - ✅ Telegram (down alerts only)
   - ✅ Slack (optional)

4. **Alert When**:
   - ✅ Down
   - ✅ Up (optional - recovery notifications)
   - ✅ SSL Expiry (for SSL monitor)

5. **Threshold**:
   - Recommended: 2 minutes
   - Prevents false alarms from temporary blips

---

## Monitor Dashboard

### View Monitor Status

1. **Dashboard**: https://dashboard.uptimerobot.com

2. **Monitor States**:
   - 🟢 **Up**: Everything working
   - 🔴 **Down**: Monitor failing
   - ⚠️ **Paused**: Monitoring paused
   - ⏸️ **Waiting**: Initial check pending

3. **Response Times**:
   - View average response time
   - Identify slow responses
   - Set alerts for high response times

### Public Status Page (Optional)

Create a public status page for users:

1. Go to **"Status Pages"**

2. Click **"Add New Status Page"**

3. **Page Type**: Public

4. **URL**: Choose subdomain
   - Example: `webapp-status.uptimerobot.com`
   - Or use custom domain

5. **Monitors to Show**:
   - ✅ WebApp Health Check
   - ✅ WebApp Homepage
   - ❌ Database (security - don't expose)

6. **Customization**:
   - Add logo
   - Choose theme
   - Add custom message

7. **Share URL**: `https://webapp-status.uptimerobot.com`
   - Add link to your app footer
   - Share with customers during outages

---

## Alternative Monitoring Services

### Pingdom (Paid, Professional)

**Pros**:
- More detailed checks (1-minute intervals)
- Transaction monitoring (user flows)
- Real user monitoring (RUM)
- Detailed reporting

**Cons**:
- ❌ No free tier
- Starting at $10/month

**Setup**:
1. Go to https://www.pingdom.com
2. Similar to UptimeRobot
3. Better for enterprise needs

### Better Uptime (Good Balance)

**Pros**:
- Free tier available
- On-call scheduling
- Incident management
- Phone call alerts

**Cons**:
- Free tier limited to 10 monitors

**Setup**:
1. Go to https://betteruptime.com
2. Similar setup to UptimeRobot
3. Good for teams

### Healthchecks.io (Cron Monitoring)

**Pros**:
- Free tier: 20 checks
- Perfect for backup monitoring
- Simple API

**Use Case**: Monitor cron jobs and backups

**Setup**:
1. Go to https://healthchecks.io
2. Create check: "Database Backup"
3. Copy ping URL
4. Add to backup script:
   ```env
   BACKUP_HEALTHCHECK_URL="https://hc-ping.com/your-uuid"
   ```

### Self-Hosted Options

#### Uptime Kuma (Free, Open Source)

**Pros**:
- ✅ Completely free
- ✅ Self-hosted
- ✅ Beautiful UI
- ✅ Unlimited monitors

**Cons**:
- ❌ Requires separate server (defeats purpose if on same server)

**Setup**:
```bash
# Docker Compose
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

---

## Integration with Your Alert System

### Combine External + Internal Monitoring

**Architecture**:
```
External (UptimeRobot)
  ↓ Checks every 5 min
  ↓ Monitors: /api/health
  ↓
Your Application
  ↓ Returns health status
  ↓ Includes database check
  ↓
Internal Monitoring (Cron)
  ↓ Every 5 min
  ↓ Detailed checks
  ↓
Alert System (Email/Telegram)
  ↓ Immediate notifications
```

### Alert Routing Strategy

| Scenario | External | Internal | Action |
|----------|----------|----------|--------|
| Both green | ✅ | ✅ | All good |
| External red, Internal green | 🔴 | ✅ | Network issue |
| External green, Internal red | ✅ | 🔴 | App issue |
| Both red | 🔴 | 🔴 | Server down |

### Example Alert Rules

```bash
# In /usr/local/bin/check-app-health.sh

EXTERNAL_LAST_SEEN="/tmp/uptimerobot-last-ping"

# UptimeRobot hits /api/health, which updates this file
# If file is old (>10 min), external monitoring might be down

if [ -f "$EXTERNAL_LAST_SEEN" ]; then
    AGE=$(($(date +%s) - $(stat -c %Y "$EXTERNAL_LAST_SEEN")))
    if [ $AGE -gt 600 ]; then  # 10 minutes
        send_alert "External monitoring hasn't checked in ${AGE}s" "WARNING"
    fi
fi
```

---

## Monitoring Best Practices

### 1. Monitor Multiple Endpoints

```
✅ https://yourdomain.com               # Homepage
✅ https://yourdomain.com/api/health    # Health check
✅ https://yourdomain.com/login         # Critical feature
✅ https://api.yourdomain.com/v1/status # API status (if separate)
```

### 2. Set Appropriate Intervals

| Monitor Type | Interval | Reason |
|--------------|----------|--------|
| Production site | 5 minutes | Balance cost vs speed |
| Staging/dev | 15-30 minutes | Less critical |
| Critical API | 1 minute (paid) | Immediate detection |
| SSL cert | Daily | Changes rarely |

### 3. Configure Smart Alerts

**Avoid Alert Fatigue**:
```
❌ Alert on first failure
✅ Alert after 2 consecutive failures (2 min threshold)

❌ Alert for every recovery
✅ Alert only for extended downtimes (>5 min)

❌ Send all alerts to everyone
✅ Route by severity:
   - Critical → SMS + Telegram + Email
   - Warning → Email only
   - Info → Dashboard only
```

### 4. Use Maintenance Windows

Before deployments:
1. UptimeRobot → Monitor → Edit
2. Enable "Maintenance Mode"
3. Duration: 30 minutes
4. Prevents false alarms during updates

### 5. Monitor Response Time

Set alerts for slow responses:
1. Edit monitor
2. "Alert if response time is greater than"
3. Set threshold: 2000ms (2 seconds)
4. Get alerted before complete failure

### 6. Regular Testing

```bash
# Monthly drill: Break something intentionally
# 1. Stop application
docker-compose stop app

# 2. Verify UptimeRobot detects it (5-10 min)
# 3. Verify you receive alerts
# 4. Fix it
docker-compose start app

# 5. Verify recovery alerts
```

---

## Monitoring Checklist

### Initial Setup

- [ ] UptimeRobot account created
- [ ] Health check monitor added (`/api/health`)
- [ ] Homepage monitor added
- [ ] SSL certificate monitoring enabled
- [ ] Email alerts configured
- [ ] Telegram/Slack alerts configured (optional)
- [ ] Alert threshold set (2+ minutes)
- [ ] Test alerts sent and received

### Optional Enhancements

- [ ] Public status page created
- [ ] Multiple endpoint monitoring
- [ ] Response time alerts configured
- [ ] Healthchecks.io for backup monitoring
- [ ] Maintenance window documented
- [ ] Alert escalation policy defined
- [ ] On-call rotation set up (if team)

### Monthly Maintenance

- [ ] Review uptime statistics
- [ ] Check response time trends
- [ ] Test alert delivery
- [ ] Update alert contacts if needed
- [ ] Review false positive alerts
- [ ] Conduct planned downtime drill

---

## Cost Comparison

| Service | Free Tier | Paid Tier | Best For |
|---------|-----------|-----------|----------|
| **UptimeRobot** | 50 monitors, 5-min checks | $7/mo (1-min checks) | Most users |
| **Pingdom** | ❌ None | $10/mo | Enterprise |
| **Better Uptime** | 10 monitors | $20/mo | Teams |
| **Healthchecks.io** | 20 checks | $3/mo | Cron monitoring |
| **Uptime Kuma** | Unlimited | Free (self-hosted) | Tech-savvy |

**Recommendation**: Start with UptimeRobot free tier

---

## Troubleshooting

### Monitor Shows "Down" But Site Works

**Possible causes**:
1. Health endpoint not responding correctly
2. Firewall blocking UptimeRobot IPs
3. Rate limiting blocking frequent checks

**Solutions**:
```bash
# 1. Test health endpoint manually
curl -v https://yourdomain.com/api/health

# 2. Check if returns 200 + correct JSON
# Expected: {"status":"ok",...}

# 3. Check server logs for 5-minute interval requests
tail -f /var/log/nginx/access.log | grep health

# 4. Whitelist UptimeRobot IPs (if using firewall)
# IPs: https://uptimerobot.com/locations
```

### SSL Alert But Certificate Valid

**Issue**: SSL expiry warning but cert is valid

**Check**:
```bash
# Check SSL expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt if needed
sudo certbot renew

# Force UptimeRobot to recheck
# Dashboard → Monitor → "Force Check"
```

### Too Many False Positives

**Solution**: Increase alert threshold
- Current: Alert after 1 failure (30 seconds)
- Recommended: Alert after 2-3 failures (2-5 minutes)

---

## Next Steps

After UptimeRobot is set up:

1. ✅ Monitor for 24 hours, check for false positives
2. ✅ Set up Healthchecks.io for backup monitoring
3. ✅ Create public status page (optional)
4. ✅ Document incident response process
5. ✅ [Test backup restore procedure](./BACKUP_TESTING.md)

---

**External Monitoring Complete!** 📊

You now have:
- ✅ 24/7 external uptime monitoring
- ✅ Health endpoint checks
- ✅ SSL certificate monitoring
- ✅ Multiple alert channels (email, Telegram, Slack)
- ✅ Public status page (optional)
- ✅ Response time monitoring
- ✅ Independent from your server

**Uptime Target**: 99.9% (43 minutes downtime/month max)

---

**Last Updated**: November 1, 2025
