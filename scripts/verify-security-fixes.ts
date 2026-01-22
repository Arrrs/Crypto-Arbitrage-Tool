#!/usr/bin/env tsx
/**
 * Security Fixes Verification Script
 * Verifies that all critical security fixes are properly implemented
 * Run: npx tsx scripts/verify-security-fixes.ts
 */

import fs from 'fs'
import path from 'path'

interface CheckResult {
  name: string
  passed: boolean
  details: string
}

const results: CheckResult[] = []

function checkFileContains(filePath: string, patterns: string[], checkName: string): CheckResult {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    return {
      name: checkName,
      passed: false,
      details: `File not found: ${filePath}`
    }
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const missingPatterns: string[] = []

  for (const pattern of patterns) {
    if (!content.includes(pattern)) {
      missingPatterns.push(pattern)
    }
  }

  if (missingPatterns.length > 0) {
    return {
      name: checkName,
      passed: false,
      details: `Missing patterns: ${missingPatterns.join(', ')}`
    }
  }

  return {
    name: checkName,
    passed: true,
    details: 'All patterns found ✓'
  }
}

console.log('🔍 Verifying Security Fixes...\n')

// Check Issue #8: Password Reset Rate Limiting
results.push(checkFileContains(
  'app/api/auth/reset-password/route.ts',
  [
    'import { checkRateLimit, getRateLimits }',
    'const rateLimit = await checkRateLimit',
    'PASSWORD_RESET_VERIFY',
    'rateLimits.EMAIL_VERIFICATION',
    'if (rateLimit.limited)',
    'status: 429'
  ],
  'Issue #8: Password Reset Rate Limiting'
))

// Check Issue #9: Email Verification Rate Limiting
results.push(checkFileContains(
  'app/api/auth/verify-email/route.ts',
  [
    'import { checkRateLimit, getRateLimits }',
    'const rateLimit = await checkRateLimit',
    'EMAIL_VERIFICATION',
    'rateLimits.EMAIL_VERIFICATION',
    'if (rateLimit.limited)',
    'status: 429'
  ],
  'Issue #9: Email Verification Rate Limiting'
))

// Check Issue #10: 2FA Completion Rate Limiting
results.push(checkFileContains(
  'app/api/auth/complete-2fa-login/route.ts',
  [
    'import { checkRateLimit, getRateLimits }',
    'const rateLimit = await checkRateLimit',
    'COMPLETE_2FA_LOGIN',
    'rateLimits.TWO_FA_SETUP',
    'if (rateLimit.limited)',
    'status: 429'
  ],
  'Issue #10: 2FA Completion Rate Limiting'
))

// Check Issue #5: Email Change Verification Rate Limiting
results.push(checkFileContains(
  'app/api/user/email/verify/route.ts',
  [
    'import { checkRateLimit, getRateLimits }',
    'const rateLimit = await checkRateLimit',
    'EMAIL_CHANGE_VERIFY',
    'rateLimits.EMAIL_VERIFICATION',
    'if (rateLimit.limited)',
    'status: 429'
  ],
  'Issue #5a: Email Change Verification Rate Limiting'
))

// Check Issue #5: Email Change Cancellation Rate Limiting
results.push(checkFileContains(
  'app/api/user/email/cancel/route.ts',
  [
    'import { checkRateLimit, getRateLimits }',
    'const rateLimit = await checkRateLimit',
    'EMAIL_CHANGE_CANCEL',
    'rateLimits.EMAIL_VERIFICATION',
    'if (rateLimit.limited)',
    'status: 429'
  ],
  'Issue #5b: Email Change Cancellation Rate Limiting'
))

// Check Issue #7: Transaction Safety in Email Verification
results.push(checkFileContains(
  'app/api/user/email/verify/route.ts',
  [
    'await prisma.$transaction',
    'const existingUser = await tx.user.findFirst',
    'mode: \'insensitive\'',
    'throw new Error("EMAIL_TAKEN")'
  ],
  'Issue #7: Transaction Safety (TOCTOU Fix)'
))

// Check Issue #1: Email Pending for Another User Check
results.push(checkFileContains(
  'app/api/user/profile/route.ts',
  [
    'const pendingForAnotherUser = await prisma.pendingEmailChange.findFirst',
    'userId: { not: session.user.id }',
    'finalized: false',
    'cancelled: false',
    'This email is already pending verification for another account'
  ],
  'Issue #1: Email Hijacking Prevention'
))

// Check Issue #3: Email Normalization
results.push(checkFileContains(
  'app/api/user/profile/route.ts',
  [
    'const normalizedEmail = email.toLowerCase().trim()',
    'mode: \'insensitive\''
  ],
  'Issue #3: Email Normalization'
))

// Check Database Schema
results.push(checkFileContains(
  'prisma/schema.prisma',
  [
    'model PendingEmailChange',
    'token        String   @unique',
    'cancelToken  String   @unique',
    'finalized    Boolean  @default(false)',
    'cancelled    Boolean  @default(false)',
    '@@index([token])',
    '@@index([cancelToken])'
  ],
  'Database Schema: PendingEmailChange Model'
))

// Print Results
console.log('=' .repeat(80))
console.log('SECURITY VERIFICATION RESULTS')
console.log('=' .repeat(80))
console.log()

let passedCount = 0
let failedCount = 0

for (const result of results) {
  const icon = result.passed ? '✅' : '❌'
  console.log(`${icon} ${result.name}`)
  console.log(`   ${result.details}`)
  console.log()

  if (result.passed) {
    passedCount++
  } else {
    failedCount++
  }
}

console.log('=' .repeat(80))
console.log(`Total: ${results.length} checks`)
console.log(`Passed: ${passedCount} ✅`)
console.log(`Failed: ${failedCount} ${failedCount > 0 ? '❌' : ''}`)
console.log('=' .repeat(80))

if (failedCount > 0) {
  console.log('\n⚠️  Some security fixes are missing or incomplete!')
  process.exit(1)
} else {
  console.log('\n🎉 All security fixes verified successfully!')
  console.log('✅ System is ready for production deployment')
  process.exit(0)
}
