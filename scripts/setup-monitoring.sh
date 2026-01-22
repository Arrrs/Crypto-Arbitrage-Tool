#!/bin/bash
#
# Monitoring Setup Script
#
# Sets up comprehensive monitoring for your application:
# - System resource monitoring
# - Application health checks
# - Log monitoring
# - Alert notifications
#
# Run with: sudo bash scripts/setup-monitoring.sh
#

set -e

echo "========================================="
echo "NextAuth Template - Monitoring Setup"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo bash scripts/setup-monitoring.sh)"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="/var/log/webapp"

# Create log directory
mkdir -p "$LOG_DIR"

echo "Select monitoring components to install:"
echo ""
echo "1. System Resource Monitoring (disk, CPU, memory)"
echo "2. Application Health Monitoring"
echo "3. Log Rotation Setup"
echo "4. Alert Notifications (email/telegram)"
echo "5. All of the above"
echo ""
read -p "Enter choice (1-5): " CHOICE

case $CHOICE in
    1|5)
        echo ""
        echo "========================================="
        echo "Setting up System Resource Monitoring"
        echo "========================================="

        # Create system monitoring script
        cat > /usr/local/bin/check-system-resources.sh << 'EOF'
#!/bin/bash
#
# System Resource Monitor
# Checks disk space, CPU, memory and sends alerts if thresholds exceeded
#

LOG_FILE="/var/log/webapp/system-monitor.log"

# Thresholds
DISK_THRESHOLD=80
CPU_THRESHOLD=90
MEMORY_THRESHOLD=90

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    log "⚠️  WARNING: Disk usage is ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
fi

# Check CPU usage (5-minute average)
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}' | cut -d'.' -f1)
if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
    log "⚠️  WARNING: CPU usage is ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
    log "⚠️  WARNING: Memory usage is ${MEMORY_USAGE}% (threshold: ${MEMORY_THRESHOLD}%)"
fi

# Log current status
log "System OK - Disk: ${DISK_USAGE}%, CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%"
EOF

        chmod +x /usr/local/bin/check-system-resources.sh

        # Add to cron (every 15 minutes)
        CRON_JOB="*/15 * * * * /usr/local/bin/check-system-resources.sh"
        if ! crontab -l 2>/dev/null | grep -q "check-system-resources.sh"; then
            (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
            echo "✅ System monitoring cron job installed"
        fi
        ;&

    2|5)
        echo ""
        echo "========================================="
        echo "Setting up Application Health Monitoring"
        echo "========================================="

        # Create health check script
        cat > /usr/local/bin/check-app-health.sh << 'EOF'
#!/bin/bash
#
# Application Health Monitor
# Checks if application is responding and database is accessible
#

LOG_FILE="/var/log/webapp/health-monitor.log"
APP_URL="${APP_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="$APP_URL/api/health"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check health endpoint
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" --max-time 10)

if [ "$RESPONSE" = "200" ]; then
    log "✅ Application is healthy (HTTP $RESPONSE)"
else
    log "❌ Application health check failed (HTTP $RESPONSE)"

    # Try to restart application (if using Docker)
    if command -v docker-compose &> /dev/null; then
        log "Attempting to restart application..."
        cd /path/to/app && docker-compose restart app
    fi
fi

# Check database connectivity
if docker exec webapp_postgres pg_isready -U webapp_user > /dev/null 2>&1; then
    log "✅ Database is accessible"
else
    log "❌ Database is not accessible"
fi
EOF

        chmod +x /usr/local/bin/check-app-health.sh

        # Add to cron (every 5 minutes)
        CRON_JOB="*/5 * * * * /usr/local/bin/check-app-health.sh"
        if ! crontab -l 2>/dev/null | grep -q "check-app-health.sh"; then
            (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
            echo "✅ Application health monitoring cron job installed"
        fi
        ;&

    3|5)
        echo ""
        echo "========================================="
        echo "Setting up Log Rotation"
        echo "========================================="

        # Create logrotate configuration
        cat > /etc/logrotate.d/webapp << 'EOF'
/var/log/webapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        # Restart application to reopen log files (if needed)
        # docker-compose -f /path/to/docker-compose.yml restart app > /dev/null 2>&1 || true
    endscript
}
EOF

        echo "✅ Log rotation configured (14 days retention)"
        ;&

    4|5)
        echo ""
        echo "========================================="
        echo "Setting up Alert Notifications"
        echo "========================================="

        # Create alert notification script
        cat > /usr/local/bin/send-alert.sh << 'EOF'
#!/bin/bash
#
# Alert Notification Script
# Sends alerts via email or Telegram
#

ALERT_MESSAGE="$1"
ALERT_LEVEL="${2:-WARNING}"

# Email configuration (optional)
EMAIL_ENABLED="${EMAIL_ENABLED:-false}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
SMTP_SERVER="${SMTP_HOST:-localhost}"

# Telegram configuration (optional)
TELEGRAM_ENABLED="${TELEGRAM_ENABLED:-false}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Send email alert
if [ "$EMAIL_ENABLED" = "true" ]; then
    echo "$ALERT_MESSAGE" | mail -s "[$ALERT_LEVEL] WebApp Alert" "$ALERT_EMAIL"
fi

# Send Telegram alert
if [ "$TELEGRAM_ENABLED" = "true" ] && [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=[$ALERT_LEVEL] $ALERT_MESSAGE" \
        -d "parse_mode=HTML" > /dev/null 2>&1
fi

# Log alert
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$ALERT_LEVEL] $ALERT_MESSAGE" >> /var/log/webapp/alerts.log
EOF

        chmod +x /usr/local/bin/send-alert.sh
        echo "✅ Alert notification script installed"
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "✅ Monitoring Setup Complete!"
echo "========================================="
echo ""
echo "Installed components:"
if [ -f /usr/local/bin/check-system-resources.sh ]; then
    echo "  ✅ System resource monitoring (every 15 min)"
fi
if [ -f /usr/local/bin/check-app-health.sh ]; then
    echo "  ✅ Application health checks (every 5 min)"
fi
if [ -f /etc/logrotate.d/webapp ]; then
    echo "  ✅ Log rotation (daily, 14 days retention)"
fi
if [ -f /usr/local/bin/send-alert.sh ]; then
    echo "  ✅ Alert notifications"
fi

echo ""
echo "========================================="
echo "Next Steps"
echo "========================================="
echo ""
echo "1. Configure alert notifications in .env:"
echo ""
echo "   # Email alerts"
echo "   EMAIL_ENABLED=true"
echo "   ALERT_EMAIL=admin@yourdomain.com"
echo ""
echo "   # Telegram alerts"
echo "   TELEGRAM_ENABLED=true"
echo "   TELEGRAM_BOT_TOKEN=your-bot-token"
echo "   TELEGRAM_CHAT_ID=your-chat-id"
echo ""
echo "2. View monitoring logs:"
echo "   tail -f /var/log/webapp/system-monitor.log"
echo "   tail -f /var/log/webapp/health-monitor.log"
echo "   tail -f /var/log/webapp/alerts.log"
echo ""
echo "3. Test alert system:"
echo "   /usr/local/bin/send-alert.sh \"Test alert message\" \"INFO\""
echo ""
echo "4. View cron jobs:"
echo "   crontab -l"
echo ""
echo "========================================="
echo "External Monitoring Services"
echo "========================================="
echo ""
echo "Consider adding these services:"
echo ""
echo "1. UptimeRobot (Free tier available)"
echo "   URL: https://uptimerobot.com"
echo "   Monitor: https://yourdomain.com/api/health"
echo ""
echo "2. Healthchecks.io (Free tier available)"
echo "   URL: https://healthchecks.io"
echo "   For backup monitoring"
echo ""
echo "3. Sentry (Error tracking)"
echo "   URL: https://sentry.io"
echo "   npm install @sentry/nextjs"
echo ""
