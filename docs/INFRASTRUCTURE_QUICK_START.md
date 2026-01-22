# Infrastructure Quick Start Guide

Complete guide to set up firewall, backups, and monitoring in **15 minutes**.

---

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Docker and Docker Compose installed
- Application already deployed

---

## Step 1: Firewall Setup (2 minutes)

### Run Setup Script

```bash
# From project root
sudo bash scripts/setup-firewall.sh
```

### Verify Firewall

```bash
# Check firewall status
sudo ufw status verbose

# Should show:
# Status: active
# To                         Action      From
# --                         ------      ----
# 22/tcp                     LIMIT       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

### Customization (Optional)

Edit the script before running if you need:
- Different SSH port: `export SSH_PORT=2222`
- Expose Metabase externally: `export EXPOSE_METABASE=true`

---

## Step 2: Database Backups (5 minutes)

### Run Backup Setup

```bash
# Install automated daily backups
sudo bash scripts/setup-cron-backups.sh
```

This will:
- Create backup directory (`/var/backups/webapp`)
- Schedule daily backups at 2 AM
- Configure 7-day retention

### Test Backup Manually

```bash
# Run backup now
bash scripts/backup-database.sh

# Check backup was created
ls -lh /var/backups/webapp/
```

### View Backup Logs

```bash
tail -f /var/log/webapp/backup.log
```

### Configure Backup Options

Edit `.env` to customize:

```env
# Backup retention (default: 7 days)
BACKUP_RETENTION_DAYS=7

# Backup directory (default: /var/backups/webapp)
BACKUP_DIR=/var/backups/webapp

# Optional: S3 upload for off-site backups
ENABLE_S3_UPLOAD=true
S3_BUCKET=your-bucket-name
S3_PREFIX=backups/database

# Optional: Healthchecks.io monitoring
BACKUP_HEALTHCHECK_URL=https://hc-ping.com/your-uuid
```

### Restore from Backup

```bash
# List available backups
ls -lh /var/backups/webapp/

# Restore from specific backup
bash scripts/restore-database.sh /var/backups/webapp/webapp_latest.sql.gz
```

---

## Step 3: Monitoring Setup (5 minutes)

### Run Monitoring Setup

```bash
# Interactive setup
sudo bash scripts/setup-monitoring.sh

# Select option 5 (All monitoring components)
```

This installs:
1. **System Resource Monitoring** - Checks disk, CPU, memory (every 15 min)
2. **Application Health Monitoring** - Checks app and database (every 5 min)
3. **Log Rotation** - Manages log files (daily, 14 days retention)
4. **Alert Notifications** - Sends alerts via email/Telegram

### Configure Alerts (Optional)

Edit `.env` to enable notifications:

```env
# Email alerts
EMAIL_ENABLED=true
ALERT_EMAIL=admin@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Telegram alerts
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789
```

### View Monitoring Logs

```bash
# System resource monitoring
tail -f /var/log/webapp/system-monitor.log

# Application health monitoring
tail -f /var/log/webapp/health-monitor.log

# Alerts log
tail -f /var/log/webapp/alerts.log
```

### Test Alert System

```bash
/usr/local/bin/send-alert.sh "Test alert message" "INFO"
```

---

## Step 4: Health Check Endpoint (Already Done!)

The health check endpoint is already created at `/api/health`.

### Test Health Check

```bash
# Test from command line
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-01T22:00:00.000Z",
  "uptime": 86400,
  "database": "connected",
  "responseTime": "15ms",
  "version": "1.0.0",
  "environment": "production"
}
```

### Configure External Monitoring

#### UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Create account
3. Add New Monitor:
   - Monitor Type: HTTP(s)
   - Friendly Name: "WebApp Health"
   - URL: `https://yourdomain.com/api/health`
   - Monitoring Interval: 5 minutes
4. Add alert contacts (email, Slack, etc.)

#### Healthchecks.io (Free for backups)

1. Go to https://healthchecks.io
2. Create account
3. Add Check: "Database Backup"
4. Copy ping URL
5. Add to `.env`:
   ```env
   BACKUP_HEALTHCHECK_URL=https://hc-ping.com/your-uuid
   ```

---

## Step 5: Test Everything (3 minutes)

### Run Infrastructure Tests

```bash
# From project root
bash scripts/test-infrastructure.sh
```

This checks:
- ✅ Firewall is active
- ✅ Backup script is executable
- ✅ Backup cron job is configured
- ✅ Health endpoint is responding
- ✅ Database is accessible
- ✅ System monitoring is installed
- ✅ Application monitoring is installed
- ✅ Log rotation is configured
- ✅ Alert script is installed
- ✅ Docker containers are running
- ✅ Backup directory exists
- ✅ Log directory exists

### Expected Output

```
=========================================
Infrastructure Test Suite
=========================================

Test 1: Checking firewall...
✅ Firewall is active
Test 2: Checking backup script...
✅ Backup script is executable
...
=========================================
Test Results
=========================================
Passed: 12
Failed: 0

✅ All tests passed! Infrastructure is production-ready.
```

---

## Maintenance Tasks

### Daily

- Check health check endpoint: `curl https://yourdomain.com/api/health`
- Review error logs: `docker-compose logs --tail=100 app`

### Weekly

- Check backup logs: `tail -50 /var/log/webapp/backup.log`
- Verify backups exist: `ls -lh /var/backups/webapp/`
- Review monitoring logs: `tail -50 /var/log/webapp/system-monitor.log`

### Monthly

- Test database restore: `bash scripts/restore-database.sh /var/backups/webapp/webapp_latest.sql.gz`
- Review disk space: `df -h`
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review security: `sudo ufw status verbose`

---

## Quick Reference Commands

### Firewall

```bash
# Check status
sudo ufw status verbose

# Allow new port
sudo ufw allow 8080/tcp

# Deny specific IP
sudo ufw deny from 192.168.1.100

# Reload firewall
sudo ufw reload
```

### Backups

```bash
# Manual backup
bash scripts/backup-database.sh

# List backups
ls -lh /var/backups/webapp/

# Restore latest backup
bash scripts/restore-database.sh /var/backups/webapp/webapp_latest.sql.gz

# View backup logs
tail -f /var/log/webapp/backup.log

# Check cron jobs
crontab -l
```

### Monitoring

```bash
# Check system resources
/usr/local/bin/check-system-resources.sh

# Check application health
/usr/local/bin/check-app-health.sh

# Send test alert
/usr/local/bin/send-alert.sh "Test message" "INFO"

# View logs
tail -f /var/log/webapp/system-monitor.log
tail -f /var/log/webapp/health-monitor.log
tail -f /var/log/webapp/alerts.log
```

### Health Checks

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test with status code only
curl -I http://localhost:3000/api/health

# Check from external monitoring
curl https://yourdomain.com/api/health
```

---

## Troubleshooting

### Firewall blocks legitimate traffic

```bash
# Check firewall rules
sudo ufw status numbered

# Delete specific rule
sudo ufw delete <rule-number>

# Temporarily disable firewall (DANGEROUS!)
sudo ufw disable
```

### Backup fails

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database credentials
docker exec webapp_postgres pg_isready -U webapp_user

# Run backup with verbose output
bash -x scripts/backup-database.sh
```

### Health check fails

```bash
# Check if app is running
docker ps | grep webapp_app

# Check app logs
docker-compose logs app

# Test database connection
docker exec webapp_postgres psql -U webapp_user -d webapp_prod -c "SELECT 1"
```

### Monitoring not working

```bash
# Check cron jobs
crontab -l

# Check cron logs
grep CRON /var/log/syslog

# Manually run monitoring scripts
/usr/local/bin/check-system-resources.sh
/usr/local/bin/check-app-health.sh
```

---

## Security Best Practices

### SSH Hardening

1. **Change SSH port** (edit `/etc/ssh/sshd_config`):
   ```
   Port 2222
   ```

2. **Disable password authentication**:
   ```
   PasswordAuthentication no
   PubkeyAuthentication yes
   ```

3. **Restart SSH**:
   ```bash
   sudo systemctl restart sshd
   ```

4. **Update firewall**:
   ```bash
   sudo ufw allow 2222/tcp
   sudo ufw delete allow 22/tcp
   ```

### Install fail2ban

```bash
# Install
sudo apt-get install fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
```

```bash
# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status sshd
```

### Keep System Updated

```bash
# Update packages weekly
sudo apt update && sudo apt upgrade -y

# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Next Steps

After infrastructure is set up:

1. ✅ Configure SSL/TLS certificate (Let's Encrypt)
2. ✅ Set up external monitoring (UptimeRobot)
3. ✅ Configure alert notifications
4. ✅ Test disaster recovery (backup restore)
5. ✅ Document your specific setup

---

## Support

For issues:
- Check logs: `/var/log/webapp/`
- Run tests: `bash scripts/test-infrastructure.sh`
- Review docs: [docs/PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

---

**Infrastructure Setup Complete!** 🎉

Your application now has:
- ✅ Secure firewall
- ✅ Automated daily backups (7-day retention)
- ✅ System resource monitoring (every 15 min)
- ✅ Application health checks (every 5 min)
- ✅ Log rotation (14-day retention)
- ✅ Alert notifications (email/Telegram)
- ✅ Health check endpoint for external monitoring

**Production Readiness: 100%** ✅
