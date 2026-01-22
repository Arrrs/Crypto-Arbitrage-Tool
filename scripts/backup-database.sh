#!/bin/bash
#
# Database Backup Script
#
# Automated PostgreSQL backup with compression, retention, and optional cloud upload
# Run manually: bash scripts/backup-database.sh
# Or schedule with cron: 0 2 * * * /path/to/scripts/backup-database.sh
#

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database configuration
DB_NAME="${POSTGRES_DB:-webapp_prod}"
DB_USER="${POSTGRES_USER:-webapp_user}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/webapp}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/webapp_${DB_NAME}_$TIMESTAMP.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Cloud backup (optional)
ENABLE_S3_UPLOAD="${ENABLE_S3_UPLOAD:-false}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/database}"

# Monitoring (optional)
HEALTHCHECK_URL="${BACKUP_HEALTHCHECK_URL:-}"  # e.g., healthchecks.io URL

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "❌ ERROR: $1"
    exit 1
}

# ============================================================================
# MAIN BACKUP PROCESS
# ============================================================================

log "========================================="
log "Starting database backup..."
log "========================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL is accessible
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    error "PostgreSQL is not accessible at $DB_HOST:$DB_PORT"
fi

log "Database: $DB_NAME"
log "Backup file: $BACKUP_FILE"

# Create backup
log "Creating backup..."
if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --create \
    --verbose \
    2>> "$LOG_FILE" | gzip > "$BACKUP_FILE"; then

    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup created successfully: $BACKUP_SIZE"
else
    error "Failed to create backup"
fi

# Verify backup integrity
log "Verifying backup integrity..."
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    log "✅ Backup integrity verified"
else
    error "Backup file is corrupted"
fi

# Create a 'latest' symlink
LATEST_LINK="$BACKUP_DIR/webapp_latest.sql.gz"
ln -sf "$BACKUP_FILE" "$LATEST_LINK"
log "✅ Latest backup symlink created"

# ============================================================================
# CLEANUP OLD BACKUPS
# ============================================================================

log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "webapp_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "✅ Deleted $DELETED_COUNT old backup(s)"

# ============================================================================
# CLOUD UPLOAD (OPTIONAL)
# ============================================================================

if [ "$ENABLE_S3_UPLOAD" = "true" ] && [ -n "$S3_BUCKET" ]; then
    log "Uploading to S3: s3://$S3_BUCKET/$S3_PREFIX/..."

    if command -v aws &> /dev/null; then
        if aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$S3_PREFIX/$(basename $BACKUP_FILE)" \
            --storage-class STANDARD_IA \
            --only-show-errors; then
            log "✅ Backup uploaded to S3"

            # Upload 'latest' copy
            aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/$S3_PREFIX/latest.sql.gz" \
                --storage-class STANDARD_IA \
                --only-show-errors
        else
            log "⚠️  WARNING: S3 upload failed (backup saved locally)"
        fi
    else
        log "⚠️  WARNING: AWS CLI not installed, skipping S3 upload"
    fi
fi

# ============================================================================
# BACKUP STATISTICS
# ============================================================================

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "webapp_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "========================================="
log "✅ Backup Complete!"
log "========================================="
log "Total backups: $TOTAL_BACKUPS"
log "Total size: $TOTAL_SIZE"
log "Latest: $LATEST_LINK"
log "========================================="

# ============================================================================
# HEALTH CHECK PING (OPTIONAL)
# ============================================================================

if [ -n "$HEALTHCHECK_URL" ]; then
    curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" > /dev/null 2>&1 || true
fi

exit 0
