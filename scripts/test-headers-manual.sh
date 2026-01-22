#!/bin/bash

# Manual test script for rate limit headers
# This script tests a few endpoints to demonstrate proper headers

BASE_URL="http://localhost:3000"

echo "=========================================="
echo "Rate Limit Headers Test Script"
echo "=========================================="
echo ""
echo "This script will test rate-limited endpoints to verify headers."
echo "Make sure the dev server is running: npm run dev"
echo ""
sleep 2

# Test 1: /api/auth/register (easy to trigger - 3 attempts per hour)
echo "### Test 1: /api/auth/register ###"
echo "Triggering rate limit (max 3 attempts)..."
for i in {1..5}; do
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test\",\"email\":\"test$RANDOM@example.com\",\"password\":\"Test123456!\"}")

  status=$(echo "$response" | grep HTTP_STATUS | cut -d: -f2)

  if [ "$status" = "429" ]; then
    echo ""
    echo "✅ Rate limit triggered! Full response headers:"
    curl -i -X POST "$BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"Test\",\"email\":\"test$RANDOM@example.com\",\"password\":\"Test123456!\"}" 2>/dev/null | grep -iE "(HTTP/|retry-after|x-ratelimit)" | head -10
    break
  fi
  echo "  Attempt $i: Status $status (not rate limited yet)"
  sleep 0.5
done

echo ""
echo "=========================================="
echo ""

# Test 2: /api/auth/verify-2fa
echo "### Test 2: /api/auth/verify-2fa ###"
echo "Triggering rate limit (max 10 attempts)..."
for i in {1..12}; do
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/verify-2fa" \
    -H "Content-Type: application/json" \
    -d '{"userId":"test-user","code":"123456"}')

  status=$(echo "$response" | grep HTTP_STATUS | cut -d: -f2)

  if [ "$status" = "429" ]; then
    echo ""
    echo "✅ Rate limit triggered! Full response headers:"
    curl -i -X POST "$BASE_URL/api/auth/verify-2fa" \
      -H "Content-Type: application/json" \
      -d '{"userId":"test-user","code":"123456"}' 2>/dev/null | grep -iE "(HTTP/|retry-after|x-ratelimit)" | head -10
    break
  fi
  echo "  Attempt $i: Status $status (not rate limited yet)"
  sleep 0.3
done

echo ""
echo "=========================================="
echo ""

# Test 3: /api/auth/forgot-password
echo "### Test 3: /api/auth/forgot-password ###"
echo "Triggering rate limit..."
for i in {1..7}; do
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}')

  status=$(echo "$response" | grep HTTP_STATUS | cut -d: -f2)

  if [ "$status" = "429" ]; then
    echo ""
    echo "✅ Rate limit triggered! Full response headers:"
    curl -i -X POST "$BASE_URL/api/auth/forgot-password" \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com"}' 2>/dev/null | grep -iE "(HTTP/|retry-after|x-ratelimit)" | head -10
    break
  fi
  echo "  Attempt $i: Status $status (not rate limited yet)"
  sleep 0.3
done

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "Expected headers on 429 responses:"
echo "  - retry-after: <seconds>"
echo "  - x-ratelimit-limit: <max attempts>"
echo "  - x-ratelimit-remaining: 0"
echo ""
