# Backup Testing & Disaster Recovery Guide

Complete guide to test your backups and practice disaster recovery procedures.

**Last Updated**: November 1, 2025
**Recommended Frequency**: Monthly

---

## Table of Contents

1. [Why Test Backups?](#why-test-backups)
2. [Manual Backup Testing](#manual-backup-testing)
3. [Automated Backup Testing](#automated-backup-testing)
4. [Disaster Recovery Drill](#disaster-recovery-drill)
5. [Common Issues](#common-issues)

---

## Why Test Backups?

### The Untested Backup Problem

> "Backups without testing are just hopes and prayers" - Unknown SRE

**Statistics**:
- 30% of companies never test their backups
- 60% of untested backups fail when needed
- 93% of companies without disaster recovery plan close within 1 year

**Real Scenarios**:
- ✅ Tested backup: Restore in 10 minutes, business continues
- ❌ Untested backup: Corrupted file discovered during outage, business lost

### What We're Testing

1. **Backup Integrity**: File is not corrupted
2. **Restore Process**: Can actually restore data
3. **Data Completeness**: All tables and data present
4. **Application Recovery**: App works with restored data
5. **Time to Recover**: How long does it take?

---

## Manual Backup Testing

### Quick Test (5 minutes)

Test backup file integrity without full restore:

```bash
# From project root
cd /home/ars/Dev/nextAuth

# Test 1: Check backup file exists
ls -lh /var/backups/webapp/webapp_latest.sql.gz

# Expected: File exists, size >1MB
# Example: -rw-r--r-- 1 root root 25M Nov  1 02:00 webapp_latest.sql.gz

# Test 2: Check file integrity
gunzip -t /var/backups/webapp/webapp_latest.sql.gz

# Expected: No output = success
# If corrupted: "gzip: ... unexpected end of file"

# Test 3: Peek at backup contents
gunzip < /var/backups/webapp/webapp_latest.sql.gz | head -20

# Expected: See SQL commands
# Should start with: --
# -- PostgreSQL database dump
```

**Result**: If all 3 pass, backup file is probably good. But you still need to test restore!

### Full Test (15 minutes)

Complete restore test to verify everything works:

```bash
# Step 1: Run automated test script
bash scripts/test-backup-restore.sh
```

This script:
1. ✅ Verifies backup file integrity
2. ✅ Creates temporary test database
3. ✅ Restores backup to test database
4. ✅ Verifies table count (should be >10)
5. ✅ Verifies user data exists
6. ✅ Cleans up test database

**Expected Output**:
```
=========================================
Starting Automated Backup Test
=========================================
Testing backup: /var/backups/webapp/webapp_latest.sql.gz
Backup size: 25M
Test 1: Checking backup file integrity...
✅ Backup file integrity OK
Test 2: Creating test database...
✅ Test database created: webapp_test_20251101
Test 3: Restoring backup to test database...
✅ Backup restored successfully
Test 4: Verifying restored data...
✅ Tables restored: 28 tables found
Test 5: Verifying user data...
✅ User data verified: 150 users found
Cleaning up test database...
✅ Test database removed
=========================================
✅ All Backup Tests Passed!
=========================================
```

### Manual Restore Test (30 minutes)

Practice full disaster recovery:

```bash
# Step 1: List available backups
ls -lh /var/backups/webapp/

# Step 2: Choose a backup to test
BACKUP_FILE="/var/backups/webapp/webapp_20251101_020000.sql.gz"

# Step 3: Run restore script
bash scripts/restore-database.sh "$BACKUP_FILE"
```

**Follow the prompts**:
```
=========================================
Database Restore Tool
=========================================
Backup file: /var/backups/webapp/webapp_20251101_020000.sql.gz
Database: webapp_prod
User: webapp_user
Host: localhost:5432

Verifying backup integrity...
✅ Backup integrity verified

⚠️  WARNING: This will OVERWRITE the current database!
⚠️  Database: webapp_prod

Are you sure you want to continue? (yes/no): yes

Creating safety backup: /var/backups/webapp/pre_restore_20251101_150000.sql.gz
✅ Safety backup created

Restoring database from backup...
This may take several minutes...

=========================================
✅ Database Restored Successfully!
=========================================
Database: webapp_prod
Restored from: /var/backups/webapp/webapp_20251101_020000.sql.gz
Safety backup: /var/backups/webapp/pre_restore_20251101_150000.sql.gz
=========================================
```

**Step 4: Verify Application**

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Expected:
# {"status":"ok","timestamp":"...","database":"connected",...}

# Check application logs
docker-compose logs --tail=50 app

# Login to application
# Browse to http://localhost:3000
# Try logging in with a test user
```

**Step 5: Verify Data**

```bash
# Connect to database
docker exec -it webapp_postgres psql -U webapp_user -d webapp_prod

# Check recent users
SELECT id, email, role, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

# Check table counts
SELECT
  schemaname,
  tablename,
  (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count
FROM (
  SELECT table_name, table_schema,
    query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name), false, true, '') AS xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
) t;

# Exit
\q
```

---

## Automated Backup Testing

### Setup Monthly Automated Tests

```bash
# Add to crontab
crontab -e

# Add this line (runs 1st of each month at 3 AM)
0 3 1 * * /home/ars/Dev/nextAuth/scripts/test-backup-restore.sh >> /var/log/webapp/backup-test.log 2>&1
```

### Review Test Results

```bash
# View latest test results
tail -100 /var/log/webapp/backup-test.log

# Check for failures
grep "ERROR" /var/log/webapp/backup-test.log

# Count successful tests
grep "All Backup Tests Passed" /var/log/webapp/backup-test.log | wc -l
```

### Alert on Test Failure

Edit `scripts/test-backup-restore.sh` to add alerting:

```bash
# At the end of the script, before exit 0:

# Send success notification
/usr/local/bin/send-alert.sh "Monthly backup test passed: $USER_COUNT users, $TABLE_COUNT tables" "INFO"

# Or on error (replace all "error" function calls):
error() {
    log "❌ ERROR: $1"
    /usr/local/bin/send-alert.sh "Monthly backup test FAILED: $1" "CRITICAL"
    exit 1
}
```

---

## Disaster Recovery Drill

Practice full system recovery from scratch.

### Scenario: Complete Server Failure

**Goal**: Restore application from backups on a new server

**Time Target**: < 60 minutes

### Preparation (One-Time Setup)

Create a disaster recovery checklist:

```bash
# Create DR checklist
cat > /root/disaster-recovery-checklist.txt << 'EOF'
DISASTER RECOVERY CHECKLIST
============================

Contact Information:
- DevOps Team: +1234567890
- Database Admin: +1234567890
- Hosting Provider: support@provider.com

Critical Credentials:
- Database: [stored in password manager]
- OAuth Secrets: [stored in password manager]
- SMTP: [stored in password manager]

Backup Locations:
- Local: /var/backups/webapp/
- S3: s3://your-bucket/backups/
- Last verified: [DATE]

Recovery Steps:
1. Provision new server
2. Install dependencies
3. Clone repository
4. Restore database backup
5. Configure environment variables
6. Start application
7. Verify health
8. Update DNS
EOF
```

### DR Drill Steps

#### 1. Create Test Environment

Use a staging server or local VM:

```bash
# On new server:
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Install Docker Compose
sudo apt-get install docker-compose-plugin

# 3. Clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# 4. Copy environment file
cp .env.example .env
# Edit .env with production values
```

#### 2. Fetch Latest Backup

```bash
# Option 1: From production server
scp production-server:/var/backups/webapp/webapp_latest.sql.gz ./

# Option 2: From S3 (if configured)
aws s3 cp s3://your-bucket/backups/latest.sql.gz ./

# Option 3: Use existing backup (for drill)
cp /var/backups/webapp/webapp_latest.sql.gz ./
```

#### 3. Start Infrastructure

```bash
# Start database only
docker-compose up -d postgres

# Wait for database to be ready
sleep 10

# Verify database is running
docker exec webapp_postgres pg_isready
```

#### 4. Restore Database

```bash
# Restore backup
gunzip < webapp_latest.sql.gz | docker exec -i webapp_postgres psql -U postgres

# Verify restore
docker exec webapp_postgres psql -U postgres -d webapp_prod -c "SELECT COUNT(*) FROM users"
```

#### 5. Start Application

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f app

# Wait for app to be ready
sleep 30
```

#### 6. Verify Recovery

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test login
# Open browser: http://localhost:3000/login

# Test critical features
# - User login
# - Admin panel
# - Database queries

# Check application logs
docker-compose logs --tail=100 app
```

#### 7. Measure Recovery Time

```bash
# Record times:
# - T0: Disaster detected
# - T1: Backup retrieved
# - T2: Database restored
# - T3: Application started
# - T4: Fully operational

# Calculate RTO (Recovery Time Objective)
# Target: < 60 minutes
# Actual: [YOUR TIME]
```

#### 8. Document Lessons Learned

```bash
# Create drill report
cat > /tmp/dr-drill-$(date +%Y%m%d).txt << EOF
DISASTER RECOVERY DRILL REPORT
Date: $(date)
Conducted by: [YOUR NAME]

Timeline:
- 00:00 - Started drill
- 00:05 - Retrieved backup
- 00:10 - Database restored
- 00:15 - Application started
- 00:20 - Verification complete

Issues Encountered:
1. [LIST ANY ISSUES]
2. [E.g., "Missing environment variable for SMTP"]

Improvements Needed:
1. [LIST IMPROVEMENTS]
2. [E.g., "Document OAuth callback URLs"]

RTO Target: 60 minutes
RTO Actual: [YOUR TIME]
Status: [PASSED/FAILED]

Next Drill: [DATE]
EOF
```

---

## Common Issues & Solutions

### Issue 1: Backup Restore Fails

**Symptoms**:
```
ERROR: relation "users" already exists
```

**Cause**: Target database already has tables

**Solution**:
```bash
# Option 1: Use --clean flag (already in backup script)
gunzip < backup.sql.gz | psql -U postgres -d webapp_prod --clean

# Option 2: Drop and recreate database
docker exec webapp_postgres psql -U postgres -c "DROP DATABASE webapp_prod"
docker exec webapp_postgres psql -U postgres -c "CREATE DATABASE webapp_prod"
gunzip < backup.sql.gz | docker exec -i webapp_postgres psql -U postgres -d webapp_prod
```

### Issue 2: Backup File Corrupted

**Symptoms**:
```
gzip: backup.sql.gz: unexpected end of file
```

**Cause**: Backup was interrupted or disk full

**Solution**:
```bash
# Check disk space
df -h

# Try older backup
ls -lh /var/backups/webapp/
bash scripts/restore-database.sh /var/backups/webapp/webapp_20251031_020000.sql.gz

# If all local backups corrupted, fetch from S3
aws s3 cp s3://your-bucket/backups/webapp_20251031_020000.sql.gz ./
```

### Issue 3: Application Fails After Restore

**Symptoms**:
```
{"status":"error","database":"disconnected"}
```

**Cause**: Environment variables don't match restored database

**Common problems**:
1. Wrong database name
2. Wrong database user/password
3. Missing database extensions

**Solution**:
```bash
# Check database connection
docker exec webapp_postgres psql -U webapp_user -d webapp_prod -c "SELECT 1"

# Check extensions
docker exec webapp_postgres psql -U postgres -d webapp_prod -c "SELECT * FROM pg_extension"

# Recreate extensions if needed
docker exec webapp_postgres psql -U postgres -d webapp_prod -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""

# Restart application
docker-compose restart app
```

### Issue 4: Missing Data After Restore

**Symptoms**: Old data visible after restore

**Cause**: Restored old backup instead of latest

**Solution**:
```bash
# Check backup timestamp
ls -lh /var/backups/webapp/webapp_latest.sql.gz

# Verify backup is recent (within 24 hours)
# If not, something is wrong with backup cron

# Check backup logs
tail -100 /var/log/webapp/backup.log

# Check cron jobs
crontab -l | grep backup

# Run manual backup
bash scripts/backup-database.sh
```

---

## Testing Checklist

### Monthly Testing (Required)

- [ ] Run automated backup test: `bash scripts/test-backup-restore.sh`
- [ ] Review test logs: `tail -100 /var/log/webapp/backup-test.log`
- [ ] Verify latest backup exists and is recent
- [ ] Check backup file size is reasonable (not 0 bytes)
- [ ] Confirm backup test passed all checks

### Quarterly Testing (Recommended)

- [ ] Perform manual restore to test database
- [ ] Verify application works with restored data
- [ ] Test user login with restored data
- [ ] Check all tables are present
- [ ] Measure restore time (should be < 30 min)
- [ ] Document any issues encountered

### Annual Testing (Best Practice)

- [ ] Full disaster recovery drill
- [ ] Restore to completely new environment
- [ ] Practice with team members
- [ ] Update disaster recovery documentation
- [ ] Test S3 backup retrieval (if configured)
- [ ] Verify all credentials still work
- [ ] Update emergency contact information
- [ ] Review and update RTO/RPO targets

---

## Backup Success Metrics

### Key Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Backup Success Rate** | 100% | `grep "Backup completed" /var/log/webapp/backup.log | wc -l` |
| **Test Pass Rate** | 100% | `grep "All Backup Tests Passed" /var/log/webapp/backup-test.log | wc -l` |
| **Average Backup Size** | Stable | `ls -lh /var/backups/webapp/ | awk '{print $5}'` |
| **Restore Time** | < 30 min | Manual drill timing |
| **Last Successful Test** | < 30 days | `ls -l /var/log/webapp/backup-test.log` |

### Red Flags

| Red Flag | Action |
|----------|--------|
| ❌ Backup test failing | Investigate immediately |
| ❌ Backup size suddenly 10x smaller | Data loss? Check database |
| ❌ Backup size suddenly 10x larger | Investigate growth |
| ❌ Last test >30 days ago | Run test immediately |
| ❌ Restore time >60 minutes | Optimize restore process |

---

## Next Steps

After completing backup testing:

1. ✅ Schedule monthly automated tests
2. ✅ Add test failure alerts
3. ✅ Document your restore time (RTO)
4. ✅ Create disaster recovery runbook
5. ✅ Share DR process with team
6. ✅ Configure S3 for off-site backups
7. ✅ Set calendar reminder for quarterly DR drill

---

**Backup Testing Complete!** 🛡️

You now have:
- ✅ Automated backup integrity testing
- ✅ Monthly automated test schedule
- ✅ Manual restore procedure documented
- ✅ Disaster recovery drill process
- ✅ Common issues documented
- ✅ Success metrics defined

**Recovery Time Objective (RTO)**: < 30 minutes
**Recovery Point Objective (RPO)**: < 24 hours (daily backups)

Remember: **Untested backups are not backups!**

---

**Last Updated**: November 1, 2025
