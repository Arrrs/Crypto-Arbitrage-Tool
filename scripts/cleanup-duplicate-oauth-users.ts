import { prisma } from "../lib/prisma"

/**
 * Cleanup script to remove duplicate OAuth users
 * Keeps the oldest user (first created) and deletes newer duplicates
 */
async function cleanupDuplicateOAuthUsers() {
  const email = "arseniykalinovich@gmail.com"

  console.log(`\n🔍 Checking for duplicate users with email: ${email}\n`)

  // Find all users with this email
  const users = await prisma.user.findMany({
    where: { email },
    orderBy: { createdAt: "asc" }, // Oldest first
    include: {
      accounts: true,
      sessions: true,
    },
  })

  console.log(`Found ${users.length} user(s) with this email:\n`)

  users.forEach((user, index) => {
    console.log(`User ${index + 1}:`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Created: ${user.createdAt}`)
    console.log(`  Accounts: ${user.accounts.length}`)
    console.log(`  Sessions: ${user.sessions.length}`)
    console.log()
  })

  if (users.length <= 1) {
    console.log("✅ No duplicates found!")
    return
  }

  // Keep the first user (oldest), delete the rest
  const userToKeep = users[0]
  const usersToDelete = users.slice(1)

  console.log(`\n📌 Keeping user: ${userToKeep.id} (created ${userToKeep.createdAt})`)
  console.log(`🗑️  Deleting ${usersToDelete.length} duplicate(s):\n`)

  for (const user of usersToDelete) {
    console.log(`  - ${user.id} (created ${user.createdAt})`)

    // Delete user's accounts
    if (user.accounts.length > 0) {
      await prisma.account.deleteMany({
        where: { userId: user.id },
      })
      console.log(`    ✅ Deleted ${user.accounts.length} account(s)`)
    }

    // Delete user's sessions
    if (user.sessions.length > 0) {
      await prisma.session.deleteMany({
        where: { userId: user.id },
      })
      console.log(`    ✅ Deleted ${user.sessions.length} session(s)`)
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: user.id },
    })
    console.log(`    ✅ Deleted user\n`)
  }

  console.log("✨ Cleanup complete!\n")
}

cleanupDuplicateOAuthUsers()
  .catch((error) => {
    console.error("❌ Error:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
