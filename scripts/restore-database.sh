#!/bin/bash
#
# Database Restore Script
#
# Restore PostgreSQL database from backup
# Usage: bash scripts/restore-database.sh [backup-file]
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

BACKUP_DIR="${BACKUP_DIR:-/var/backups/webapp}"

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "❌ ERROR: $1"
    exit 1
}

list_backups() {
    echo ""
    echo "Available backups:"
    echo "===================="
    ls -lh "$BACKUP_DIR"/webapp_*.sql.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'
    echo ""
    echo "Latest backup: $(readlink -f $BACKUP_DIR/webapp_latest.sql.gz 2>/dev/null || echo 'None')"
    echo ""
}

# ============================================================================
# MAIN RESTORE PROCESS
# ============================================================================

log "========================================="
log "Database Restore Tool"
log "========================================="

# Check if backup file provided
if [ -z "$1" ]; then
    list_backups
    echo "Usage: bash scripts/restore-database.sh <backup-file>"
    echo ""
    echo "Examples:"
    echo "  bash scripts/restore-database.sh /var/backups/webapp/webapp_latest.sql.gz"
    echo "  bash scripts/restore-database.sh /var/backups/webapp/webapp_20251101_020000.sql.gz"
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
fi

log "Backup file: $BACKUP_FILE"
log "Database: $DB_NAME"
log "User: $DB_USER"
log "Host: $DB_HOST:$DB_PORT"
echo ""

# Verify backup integrity
log "Verifying backup integrity..."
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    error "Backup file is corrupted or not a valid gzip file"
fi
log "✅ Backup integrity verified"

# Warning
echo ""
echo "⚠️  WARNING: This will OVERWRITE the current database!"
echo "⚠️  Database: $DB_NAME"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled by user"
    exit 0
fi

# Check if PostgreSQL is accessible
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    error "PostgreSQL is not accessible at $DB_HOST:$DB_PORT"
fi

# Create a safety backup before restore
SAFETY_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
log "Creating safety backup: $SAFETY_BACKUP"

if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    2>/dev/null | gzip > "$SAFETY_BACKUP"; then
    log "✅ Safety backup created"
else
    log "⚠️  WARNING: Could not create safety backup (database may not exist yet)"
fi

# Restore database
log "Restoring database from backup..."
log "This may take several minutes..."
echo ""

if gunzip < "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    --quiet; then

    log "========================================="
    log "✅ Database Restored Successfully!"
    log "========================================="
    log "Database: $DB_NAME"
    log "Restored from: $BACKUP_FILE"
    log "Safety backup: $SAFETY_BACKUP"
    log "========================================="

    # Verify database
    log ""
    log "Verifying database..."
    TABLE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")

    log "✅ Found $TABLE_COUNT tables in database"

    # Show recent users (as verification)
    log ""
    log "Recent users in restored database:"
    PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5" 2>/dev/null || true

else
    error "Database restore failed! Check PostgreSQL logs for details."
fi

log ""
log "========================================="
log "Next steps:"
log "========================================="
log "1. Verify application works correctly"
log "2. Check critical data is present"
log "3. If everything is OK, you can delete safety backup:"
log "   rm $SAFETY_BACKUP"
log ""
