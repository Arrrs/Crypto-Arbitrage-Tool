import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== Testing Session Validation ===\n")

  // Get a session token
  const session = await prisma.session.findFirst({
    include: {
      user: true,
    },
  })

  if (!session) {
    console.log("No sessions found in database")
    return
  }

  console.log("Found session:")
  console.log(`  Token: ${session.sessionToken.substring(0, 20)}...`)
  console.log(`  User: ${session.user.email}`)
  console.log(`  Expires: ${session.expires}`)
  console.log(`  Now: ${new Date()}`)
  console.log(`  Is Valid: ${session.expires > new Date()}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
