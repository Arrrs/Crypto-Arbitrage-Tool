#!/bin/bash
#
# Automated Backup Restore Test
#
# Tests backup integrity and restore process without affecting production
# Run monthly: 0 3 1 * * /path/to/test-backup-restore.sh
#

set -e

LOG_FILE="/var/log/webapp/backup-test.log"
TEST_DB="webapp_test_$(date +%Y%m%d)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "❌ ERROR: $1"
    exit 1
}

log "========================================="
log "Starting Automated Backup Test"
log "========================================="

# Find latest backup
LATEST_BACKUP="/var/backups/webapp/webapp_latest.sql.gz"

if [ ! -f "$LATEST_BACKUP" ]; then
    error "No backup file found at $LATEST_BACKUP"
fi

log "Testing backup: $LATEST_BACKUP"
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
log "Backup size: $BACKUP_SIZE"

# Test 1: Backup integrity
log "Test 1: Checking backup file integrity..."
if gunzip -t "$LATEST_BACKUP" 2>/dev/null; then
    log "✅ Backup file integrity OK"
else
    error "Backup file is corrupted"
fi

# Test 2: Create test database
log "Test 2: Creating test database..."
if docker exec webapp_postgres psql -U postgres -c "CREATE DATABASE $TEST_DB" > /dev/null 2>&1; then
    log "✅ Test database created: $TEST_DB"
else
    error "Failed to create test database"
fi

# Test 3: Restore to test database
log "Test 3: Restoring backup to test database..."
if gunzip < "$LATEST_BACKUP" | docker exec -i webapp_postgres psql -U postgres -d $TEST_DB --quiet 2>/dev/null; then
    log "✅ Backup restored successfully"
else
    docker exec webapp_postgres psql -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB" > /dev/null 2>&1
    error "Failed to restore backup"
fi

# Test 4: Verify table count
log "Test 4: Verifying restored data..."
TABLE_COUNT=$(docker exec webapp_postgres psql -U postgres -d $TEST_DB -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null)

if [ "$TABLE_COUNT" -gt 10 ]; then
    log "✅ Tables restored: $TABLE_COUNT tables found"
else
    docker exec webapp_postgres psql -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB" > /dev/null 2>&1
    error "Not enough tables found. Expected >10, got $TABLE_COUNT"
fi

# Test 5: Verify user data
log "Test 5: Verifying user data..."
USER_COUNT=$(docker exec webapp_postgres psql -U postgres -d $TEST_DB -tAc "SELECT COUNT(*) FROM users" 2>/dev/null)

if [ "$USER_COUNT" -gt 0 ]; then
    log "✅ User data verified: $USER_COUNT users found"
else
    docker exec webapp_postgres psql -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB" > /dev/null 2>&1
    error "No users found in restored database"
fi

# Cleanup
log "Cleaning up test database..."
docker exec webapp_postgres psql -U postgres -c "DROP DATABASE $TEST_DB" > /dev/null 2>&1
log "✅ Test database removed"

# Success
log "========================================="
log "✅ All Backup Tests Passed!"
log "========================================="
log "Summary:"
log "  - Backup file: OK"
log "  - Restore process: OK"
log "  - Table count: $TABLE_COUNT"
log "  - User count: $USER_COUNT"
log "  - Test database: Cleaned up"
log "========================================="

exit 0
