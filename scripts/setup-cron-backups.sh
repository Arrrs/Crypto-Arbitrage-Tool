#!/bin/bash
#
# Setup Automated Database Backups
#
# This script configures cron to run daily database backups
# Run with: sudo bash scripts/setup-cron-backups.sh
#

set -e

echo "========================================="
echo "Setup Automated Database Backups"
echo "========================================="
echo ""

# Get absolute path to project
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-database.sh"
LOG_DIR="/var/log/webapp"

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

# Create log directory
echo "📁 Creating log directory..."
sudo mkdir -p "$LOG_DIR"

# Make backup script executable
echo "✅ Making backup script executable..."
chmod +x "$BACKUP_SCRIPT"

# Cron schedule (default: 2 AM daily)
CRON_SCHEDULE="${CRON_SCHEDULE:-0 2 * * *}"
CRON_JOB="$CRON_SCHEDULE cd $PROJECT_DIR && $BACKUP_SCRIPT >> $LOG_DIR/backup.log 2>&1"

echo ""
echo "Cron configuration:"
echo "===================="
echo "Schedule: $CRON_SCHEDULE (daily at 2 AM)"
echo "Script: $BACKUP_SCRIPT"
echo "Log: $LOG_DIR/backup.log"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  Cron job already exists!"
    echo ""
    echo "Current crontab:"
    crontab -l | grep "$BACKUP_SCRIPT"
    echo ""
    read -p "Do you want to replace it? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi

    # Remove old cron job
    crontab -l | grep -v "$BACKUP_SCRIPT" | crontab -
    echo "✅ Old cron job removed"
fi

# Add new cron job
echo "➕ Adding cron job..."
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "========================================="
echo "✅ Automated Backups Configured!"
echo "========================================="
echo ""
echo "Cron job installed:"
crontab -l | grep "$BACKUP_SCRIPT"
echo ""
echo "========================================="
echo "Testing & Monitoring"
echo "========================================="
echo ""
echo "1. Test backup manually:"
echo "   bash $BACKUP_SCRIPT"
echo ""
echo "2. Check backup logs:"
echo "   tail -f $LOG_DIR/backup.log"
echo ""
echo "3. List all backups:"
echo "   ls -lh /var/backups/webapp/"
echo ""
echo "4. View cron jobs:"
echo "   crontab -l"
echo ""
echo "5. Remove cron job (if needed):"
echo "   crontab -e"
echo "   # Then delete the backup line"
echo ""
echo "========================================="
echo "Backup Configuration"
echo "========================================="
echo ""
echo "Edit .env to configure:"
echo ""
echo "# Backup retention (default: 7 days)"
echo "BACKUP_RETENTION_DAYS=7"
echo ""
echo "# Backup directory (default: /var/backups/webapp)"
echo "BACKUP_DIR=/var/backups/webapp"
echo ""
echo "# Optional: S3 upload"
echo "ENABLE_S3_UPLOAD=true"
echo "S3_BUCKET=your-bucket-name"
echo "S3_PREFIX=backups/database"
echo ""
echo "# Optional: Healthchecks.io monitoring"
echo "BACKUP_HEALTHCHECK_URL=https://hc-ping.com/your-uuid"
echo ""
