/**
 * Debug script to check rate limit logs
 * Run with: npx tsx scripts/check-rate-limit-logs.ts
 */

import { prisma } from "../lib/prisma"

async function checkRateLimitLogs() {
  console.log("\n=== Rate Limit Logs Analysis ===\n")

  // Get all recent rate limit logs
  const logs = await prisma.rateLimitLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 20,
  })

  console.log(`Found ${logs.length} recent rate limit logs:\n`)

  // Group by endpoint and identifier
  const grouped = new Map<string, typeof logs>()

  for (const log of logs) {
    const key = `${log.endpoint} | ${log.identifier}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(log)
  }

  // Display grouped results
  for (const [key, entries] of grouped.entries()) {
    console.log(`\n📍 ${key}`)
    console.log(`   Total entries: ${entries.length}`)

    for (const entry of entries) {
      console.log(`   - Attempts: ${entry.attempts} | Blocked: ${entry.blocked} | Time: ${entry.timestamp.toISOString()}`)
    }

    // Calculate total attempts
    const totalAttempts = entries.reduce((sum, log) => sum + log.attempts, 0)
    console.log(`   ⚠️  Total attempts counted: ${totalAttempts}`)
  }

  await prisma.$disconnect()
}

checkRateLimitLogs().catch(console.error)
