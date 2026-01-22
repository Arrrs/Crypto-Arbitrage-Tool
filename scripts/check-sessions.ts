import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      country: true,
      city: true,
      twoFactorVerified: true,
      createdAt: true,
      expires: true,
      user: {
        select: {
          email: true,
          twoFactorEnabled: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  console.log("📊 Latest Sessions:\n")

  sessions.forEach((s, i) => {
    console.log(`${i + 1}. Session ${s.id.substring(0, 8)}...`)
    console.log(`   User: ${s.user.email}`)
    console.log(`   User has 2FA: ${s.user.twoFactorEnabled ? "✅ Yes" : "❌ No"}`)
    console.log(`   2FA Verified: ${s.twoFactorVerified ? "✅ Yes" : "⏳ Pending"}`)
    console.log(`   Created: ${s.createdAt}`)
    console.log(`   Expires: ${s.expires}`)
    console.log(`   User Agent: ${s.userAgent || "❌ NULL"}`)
    console.log(`   IP Address: ${s.ipAddress || "❌ NULL"}`)
    console.log(`   Location: ${s.country && s.city ? `${s.city}, ${s.country}` : s.country || "❌ NULL"}`)
    console.log("")
  })

  const withMetadata = sessions.filter(s => s.userAgent !== null).length
  const total = sessions.length

  console.log(`✅ Sessions with metadata: ${withMetadata}/${total}`)
  console.log(`❌ Sessions without metadata: ${total - withMetadata}/${total}`)

  if (withMetadata === 0) {
    console.log("\n⚠️  No sessions have metadata!")
    console.log("💡 This means sessions were created BEFORE the adapter was updated.")
    console.log("🔄 Solution: Logout and login again to create new session with metadata.")
  }

  // 2FA Session Statistics
  const twoFASessions = sessions.filter(s => s.user.twoFactorEnabled)
  const pendingSessions = twoFASessions.filter(s => !s.twoFactorVerified)
  const verifiedSessions = twoFASessions.filter(s => s.twoFactorVerified)

  if (twoFASessions.length > 0) {
    console.log("\n📱 2FA Session Status:")
    console.log(`   Total 2FA-enabled users: ${twoFASessions.length}`)
    console.log(`   ⏳ Pending 2FA verification: ${pendingSessions.length}`)
    console.log(`   ✅ 2FA verified: ${verifiedSessions.length}`)

    if (pendingSessions.length > 0) {
      console.log("\n⚠️  Found partial sessions (waiting for 2FA):")
      pendingSessions.forEach(s => {
        console.log(`   - ${s.user.email} (created ${s.createdAt})`)
      })
      console.log("\n💡 These sessions need 2FA verification to become fully authenticated.")
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
