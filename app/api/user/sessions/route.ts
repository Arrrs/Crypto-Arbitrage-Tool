import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"
import { getClientIP } from "@/lib/geolocation"
import { parseUserAgent } from "@/lib/analytics"
import { setCsrfTokenCookie } from "@/lib/csrf"

/**
 * Get all active sessions for the current user
 *
 * Returns session metadata including:
 * - Device/browser information
 * - IP address and location
 * - Creation and last active times
 * - Current session indicator
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  const requestId = getRequestId(request)

  try {
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      )
    }

    // Get current session token from cookie
    // Cookie name differs between dev and production (HTTPS)
    const sessionCookie =
      request.cookies.get("__Secure-next-auth.session-token") || // Production (HTTPS)
      request.cookies.get("next-auth.session-token") // Development (HTTP)
    const currentSessionToken = sessionCookie?.value

    // Fetch all active sessions for this user
    const sessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        expires: {
          gt: new Date(), // Only non-expired sessions
        },
      },
      select: {
        id: true,
        sessionToken: true,
        userAgent: true,
        ipAddress: true,
        country: true,
        city: true,
        createdAt: true,
        lastActive: true,
        expires: true,
      },
      orderBy: {
        lastActive: 'desc',
      },
    })

    // Parse user agent strings to get device/browser info
    const sessionsWithMetadata = sessions.map((s) => {
      const isCurrent = s.sessionToken === currentSessionToken

      // Use the proper parseUserAgent function from lib/analytics
      const parsed = parseUserAgent(s.userAgent)

      // Location display logic
      let location = null
      if (s.country && s.city) {
        location = `${s.city}, ${s.country}`
      } else if (s.country) {
        location = s.country
      }
      // Note: location will be null if:
      // - Geolocation API failed during login
      // - Rate limit was hit during login
      // - No geolocation data was captured yet

      return {
        id: s.id,
        browser: parsed.browser || "Unknown",
        os: parsed.os || "Unknown",
        deviceType: parsed.deviceType
          ? parsed.deviceType.charAt(0).toUpperCase() + parsed.deviceType.slice(1)
          : "Desktop",
        ipAddress: s.ipAddress,
        location, // Can be null if no geolocation data
        country: s.country,
        city: s.city,
        createdAt: s.createdAt,
        lastActive: s.lastActive,
        expires: s.expires,
        isCurrent,
      }
    })

    await logger.info("User sessions fetched", {
      category: "api",
      requestId,
      userId: session.user.id,
      metadata: { sessionCount: sessions.length },
    })

    const response = NextResponse.json({
      sessions: sessionsWithMetadata,
      total: sessionsWithMetadata.length,
    })

    // Set CSRF token for DELETE requests
    setCsrfTokenCookie(response, request)

    return response
  } catch (error) {
    await logger.error("Failed to fetch user sessions", {
      category: "api",
      requestId,
      userId: session?.user?.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })

    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    )
  }
}
