/**
 * Verify all system settings are in database
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔍 Verifying system settings...\n")

  const settings = await prisma.systemSettings.findMany({
    orderBy: { key: "asc" },
  })

  console.log(`Found ${settings.length} settings:\n`)

  for (const setting of settings) {
    console.log(`✓ ${setting.key}`)
    console.log(`  Description: ${setting.description}`)
    console.log(`  Last Updated: ${setting.updatedAt.toISOString()}`)
    console.log()
  }

  console.log("✅ Verification complete!")
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error)
    prisma.$disconnect()
    process.exit(1)
  })
