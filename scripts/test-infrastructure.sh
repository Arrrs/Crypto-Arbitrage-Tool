#!/bin/bash
#
# Infrastructure Test Script
# Tests firewall, backups, monitoring, and health checks
#

set -e

echo "========================================="
echo "Infrastructure Test Suite"
echo "========================================="
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

test_passed() {
    echo "✅ $1"
    ((TESTS_PASSED++))
}

test_failed() {
    echo "❌ $1"
    ((TESTS_FAILED++))
}

# Test 1: Firewall
echo "Test 1: Checking firewall..."
if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
    test_passed "Firewall is active"
else
    test_failed "Firewall is not active or not installed"
fi

# Test 2: Backup script exists and is executable
echo "Test 2: Checking backup script..."
if [ -x "scripts/backup-database.sh" ]; then
    test_passed "Backup script is executable"
else
    test_failed "Backup script is not executable"
fi

# Test 3: Backup cron job exists
echo "Test 3: Checking backup cron job..."
if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
    test_passed "Backup cron job is configured"
else
    test_failed "Backup cron job is not configured"
fi

# Test 4: Health check endpoint
echo "Test 4: Checking health endpoint..."
if curl -f http://localhost:3000/api/health -o /dev/null -s -m 5; then
    test_passed "Health check endpoint is responding"
else
    test_failed "Health check endpoint is not responding (is app running?)"
fi

# Test 5: Database connection
echo "Test 5: Checking database connection..."
if docker ps | grep -q "webapp_postgres" && docker exec webapp_postgres pg_isready -U webapp_user > /dev/null 2>&1; then
    test_passed "Database is accessible"
else
    test_failed "Database is not accessible (is Docker running?)"
fi

# Test 6: System monitoring
echo "Test 6: Checking system monitoring..."
if [ -x "/usr/local/bin/check-system-resources.sh" ]; then
    test_passed "System monitoring is installed"
else
    test_failed "System monitoring is not installed"
fi

# Test 7: Application monitoring
echo "Test 7: Checking application monitoring..."
if [ -x "/usr/local/bin/check-app-health.sh" ]; then
    test_passed "Application monitoring is installed"
else
    test_failed "Application monitoring is not installed"
fi

# Test 8: Log rotation
echo "Test 8: Checking log rotation..."
if [ -f "/etc/logrotate.d/webapp" ]; then
    test_passed "Log rotation is configured"
else
    test_failed "Log rotation is not configured"
fi

# Test 9: Alert script
echo "Test 9: Checking alert script..."
if [ -x "/usr/local/bin/send-alert.sh" ]; then
    test_passed "Alert script is installed"
else
    test_failed "Alert script is not installed"
fi

# Test 10: Docker containers running
echo "Test 10: Checking Docker containers..."
if docker ps | grep -q "webapp_app"; then
    test_passed "Application container is running"
else
    test_failed "Application container is not running"
fi

# Test 11: Backup directory exists
echo "Test 11: Checking backup directory..."
if [ -d "/var/backups/webapp" ]; then
    test_passed "Backup directory exists"
else
    test_failed "Backup directory does not exist"
fi

# Test 12: Log directory exists
echo "Test 12: Checking log directory..."
if [ -d "/var/log/webapp" ]; then
    test_passed "Log directory exists"
else
    test_failed "Log directory does not exist"
fi

# Summary
echo ""
echo "========================================="
echo "Test Results"
echo "========================================="
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "✅ All tests passed! Infrastructure is production-ready."
    exit 0
else
    echo "❌ Some tests failed. Please review the output above."
    echo ""
    echo "Common issues:"
    echo "- Docker not running: sudo systemctl start docker"
    echo "- App not running: docker-compose up -d"
    echo "- Monitoring not installed: sudo bash scripts/setup-monitoring.sh"
    exit 1
fi
