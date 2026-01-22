import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "next-auth/adapters"
import { prisma } from "@/lib/prisma"

/**
 * Extended Prisma Adapter
 *
 * Extends NextAuth's Prisma adapter to:
 * 1. Ensure emailVerified is set for OAuth users
 * 2. Capture session metadata (userAgent, IP, location) synchronously during session creation
 * 3. Update lastActive timestamp on session updates
 */
export function ExtendedPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma) as Adapter

  return {
    ...baseAdapter,

    // Override createUser to ensure emailVerified is set for OAuth users
    async createUser(user) {
      // Call the original createUser
      const createdUser = await baseAdapter.createUser!(user)

      // For OAuth users, ensure emailVerified is set
      // (NextAuth's adapter may not set this automatically)
      if (user.emailVerified || user.email) {
        try {
          await prisma.user.update({
            where: { id: createdUser.id },
            data: {
              emailVerified: user.emailVerified || new Date(),
            },
          })
          console.log("[ExtendedPrismaAdapter] Email verified for OAuth user:", createdUser.email)
        } catch (error) {
          console.error("[ExtendedPrismaAdapter] Failed to verify email:", error)
        }
      }

      return createdUser
    },

    // Override createSession to initialize twoFactorVerified and capture metadata for OAuth sessions
    async createSession(session) {
      // Call the original createSession
      const createdSession = await baseAdapter.createSession!(session)

      // For OAuth sessions, set twoFactorVerified to true and capture session metadata
      // Credentials sessions are created manually in /api/auth/login, not via adapter
      try {
        // Get request headers for metadata capture (available in Next.js 15+)
        let userAgent: string | undefined
        let ipAddress: string | undefined
        let country: string | undefined
        let city: string | undefined

        try {
          const { headers } = await import("next/headers")
          const headersList = await headers()

          userAgent = headersList.get("user-agent") || undefined
          ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     headersList.get("x-real-ip") ||
                     undefined

          // Get geolocation synchronously (this may delay session creation slightly)
          if (ipAddress) {
            try {
              const { getGeoLocationSafe } = await import("@/lib/geolocation-safe")
              const geo = await getGeoLocationSafe(ipAddress)
              country = geo.country || undefined
              city = geo.city || undefined
            } catch (geoError) {
              // Geolocation failed - continue without it
              console.warn("[ExtendedPrismaAdapter] Geolocation failed:", geoError)
            }
          }
        } catch (headersError) {
          // Headers not available - continue without metadata
          console.warn("[ExtendedPrismaAdapter] Headers not available:", headersError)
        }

        await prisma.session.update({
          where: { sessionToken: session.sessionToken },
          data: {
            twoFactorVerified: true,
            userAgent,
            ipAddress,
            country,
            city,
          },
        })

        console.log("[ExtendedPrismaAdapter] OAuth session created with metadata:", {
          userAgent: userAgent?.substring(0, 50),
          ipAddress,
          country,
          city,
        })
      } catch (error) {
        // Silently fail - this shouldn't break authentication
        console.error("[ExtendedPrismaAdapter] Failed to set session data:", error)
      }

      return createdSession
    },

    // Override updateSession to update lastActive timestamp
    async updateSession(session) {
      // Call the original updateSession
      const updatedSession = await baseAdapter.updateSession!(session)

      // Update lastActive timestamp (non-critical, can fail silently)
      try {
        await prisma.session.update({
          where: { sessionToken: session.sessionToken },
          data: {
            lastActive: new Date(),
          },
        })
      } catch (error) {
        // Silently fail
        console.error("[ExtendedPrismaAdapter] Failed to update lastActive:", error)
      }

      return updatedSession
    },
  }
}
