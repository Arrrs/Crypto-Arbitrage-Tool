/**
 * Cleanup old cron jobs that no longer have handlers
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🧹 Cleaning up old cron jobs...")

  // Delete old cron jobs that don't have handlers
  const deleted = await prisma.cronJob.deleteMany({
    where: {
      name: {
        in: ["check_alerts", "geo_cache_cleanup"],
      },
    },
  })

  console.log(`✅ Deleted ${deleted.count} old cron jobs`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error)
    prisma.$disconnect()
    process.exit(1)
  })
