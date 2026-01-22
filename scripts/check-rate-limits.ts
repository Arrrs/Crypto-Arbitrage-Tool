import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== Checking System Limits ===\n")

  const settings = await prisma.systemSettings.findUnique({
    where: { key: "system_limits" },
  })

  if (settings) {
    console.log("Current system_limits in database:")
    console.log(JSON.stringify(settings.value, null, 2))
  } else {
    console.log("❌ No system_limits found in database")
  }

  console.log("\n=== Checking Rate Limit Logs ===\n")

  const rateLimitLogs = await prisma.rateLimitLog.findMany({
    where: {
      endpoint: "/api/user/password",
    },
    orderBy: { timestamp: "desc" },
    take: 10,
  })

  console.log(`Found ${rateLimitLogs.length} rate limit logs for /api/user/password:`)
  rateLimitLogs.forEach((log) => {
    console.log({
      identifier: log.identifier,
      attempts: log.attempts,
      blocked: log.blocked,
      timestamp: log.timestamp,
    })
  })

  console.log("\n=== Rate Limit Window Analysis ===\n")

  // Get the window from settings or use default
  const limits = settings?.value as any
  const windowMinutes = limits?.passwordResetWindowMinutes || 60
  const maxAttempts = limits?.maxPasswordResetAttempts || 3

  console.log(`Window: ${windowMinutes} minutes`)
  console.log(`Max attempts: ${maxAttempts}`)

  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000)

  console.log(`Current time: ${now.toISOString()}`)
  console.log(`Window starts at: ${windowStart.toISOString()}`)

  // Check recent attempts
  const recentAttempts = await prisma.rateLimitLog.findMany({
    where: {
      endpoint: "/api/user/password",
      timestamp: { gte: windowStart },
    },
    orderBy: { timestamp: "desc" },
  })

  const totalAttempts = recentAttempts.reduce((sum, log) => sum + log.attempts, 0)

  console.log(`\nAttempts in current window: ${totalAttempts}`)
  console.log(`Remaining: ${Math.max(0, maxAttempts - totalAttempts)}`)
  console.log(`Would be limited: ${totalAttempts >= maxAttempts}`)

  if (recentAttempts.length > 0) {
    console.log("\nRecent attempts in window:")
    recentAttempts.forEach((log) => {
      console.log(`  - ${log.timestamp.toISOString()}: ${log.attempts} attempts (blocked: ${log.blocked})`)
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
