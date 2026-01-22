/**
 * Analyze rate limit double-counting issue
 * Run with: npx tsx scripts/analyze-rate-limit-issue.ts
 */

import { prisma } from "../lib/prisma"

async function analyze() {
  console.log("\n=== Analyzing Rate Limit Double-Counting Issue ===\n")

  // Check for duplicate timestamps (race conditions)
  const duplicates = await prisma.$queryRaw`
    SELECT identifier, endpoint, timestamp, COUNT(*) as count
    FROM rate_limit_logs
    GROUP BY identifier, endpoint, timestamp
    HAVING COUNT(*) > 1
  `

  console.log("1. Checking for duplicate timestamps (race conditions):")
  console.log(duplicates)

  // Check EMAIL_VERIFICATION specifically
  const emailVerificationLogs = await prisma.rateLimitLog.findMany({
    where: { endpoint: "EMAIL_VERIFICATION" },
    orderBy: { timestamp: "desc" },
    take: 10,
  })

  console.log("\n2. EMAIL_VERIFICATION logs (most recent 10):")
  for (const log of emailVerificationLogs) {
    console.log(`   ${log.timestamp.toISOString()} | Attempts: ${log.attempts} | Window: ${log.windowStart?.toISOString()} - ${log.windowEnd.toISOString()}`)
  }

  // Check if there are overlapping windows
  console.log("\n3. Checking for overlapping windows:")
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const recentLogs = await prisma.rateLimitLog.findMany({
    where: {
      endpoint: "EMAIL_VERIFICATION",
      identifier: "::1",
      timestamp: { gte: oneHourAgo },
    },
    orderBy: { timestamp: "asc" },
  })

  console.log(`   Found ${recentLogs.length} logs in last hour for EMAIL_VERIFICATION from ::1`)
  for (const log of recentLogs) {
    console.log(`   Entry ID: ${log.id} | Attempts: ${log.attempts} | Created: ${log.timestamp.toISOString()}`)
  }

  await prisma.$disconnect()
}

analyze().catch(console.error)
