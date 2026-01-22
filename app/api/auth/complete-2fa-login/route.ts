import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"
import { z } from "zod"
import { getClientIP } from "@/lib/geolocation"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"

const complete2FASchema = z.object({
  userId: z.string(),
  sessionToken: z.string(), // Temporary session token from login
})

/**
 * Complete login after successful 2FA verification
 *
 * ARCHITECTURE NOTE:
 * This endpoint is called AFTER the user has successfully verified their 2FA code.
 * Instead of manipulating the user's 2FA settings (which was a security risk),
 * we now update the session's twoFactorVerified flag to mark it as fully authenticated.
 *
 * Flow:
 * 1. User logs in with credentials → session created with twoFactorVerified=false
 * 2. User completes 2FA verification → this endpoint marks twoFactorVerified=true
 * 3. Middleware allows access to protected routes once twoFactorVerified=true
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  const ip = getClientIP(request) || "unknown"

  try {
    // SECURITY: Rate limit 2FA completion attempts
    // Prevents: Session enumeration attacks, DoS attacks
    // Industry Standard: 10 attempts per 15 minutes (same as 2FA setup)
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.TWO_FA_SETUP
    const rateLimit = await checkRateLimit(
      request,
      "COMPLETE_2FA_LOGIN",
      rateLimitConfig
    )

    if (rateLimit.limited) {
      const minutesRemaining = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        {
          error: "Too many completion attempts",
          message: `Too many attempts. Please try again in ${minutesRemaining} minute(s).`,
          retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(rateLimitConfig.maxAttempts),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      )
    }

    const body = await request.json()
    const { userId, sessionToken } = complete2FASchema.parse(body)

    // Find the session that was created during initial login
    const session = await prisma.session.findFirst({
      where: {
        sessionToken,
        userId,
        twoFactorVerified: false, // Must be false (pending 2FA)
        expires: { gte: new Date() }, // Must not be expired
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            twoFactorEnabled: true,
          },
        },
      },
    })

    if (!session) {
      await logger.warn("Invalid 2FA completion attempt - session not found or expired", {
        category: "security",
        requestId,
        metadata: { userId, ip },
      })

      return NextResponse.json(
        { error: "session_expired", message: "Your session has expired. Please login again." },
        { status: 401 }
      )
    }

    // Verify user still has 2FA enabled
    if (!session.user.twoFactorEnabled) {
      await logger.warn("2FA completion attempted but user no longer has 2FA enabled", {
        category: "security",
        requestId,
        metadata: { userId: session.user.id, email: session.user.email },
      })

      return NextResponse.json(
        { error: "2FA is not enabled for this account" },
        { status: 400 }
      )
    }

    // Update session to mark 2FA as verified
    // Also extend session expiration to full duration (30 days) since partial session only had 15 minutes
    const sessionMaxAgeDays = parseInt(process.env.SESSION_MAX_AGE_DAYS || "30", 10)
    const fullSessionExpiry = new Date(Date.now() + sessionMaxAgeDays * 24 * 60 * 60 * 1000)

    await prisma.session.update({
      where: { id: session.id },
      data: {
        twoFactorVerified: true,
        lastActive: new Date(),
        expires: fullSessionExpiry, // Extend to full 30-day expiry after successful 2FA
      },
    })

    // CLEANUP: Delete any other pending (unverified) 2FA sessions for this user
    // This handles edge cases where user started multiple login attempts
    const deletedPendingSessions = await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
        id: { not: session.id }, // Don't delete current session
        twoFactorVerified: false, // Only delete pending sessions
      },
    })

    if (deletedPendingSessions.count > 0) {
      await logger.info("Cleaned up stale partial 2FA sessions", {
        category: "auth",
        requestId,
        metadata: {
          userId: session.user.id,
          email: session.user.email,
          deletedCount: deletedPendingSessions.count,
        },
      })
    }

    await logger.info("2FA verification completed successfully", {
      category: "auth",
      requestId,
      metadata: {
        userId: session.user.id,
        email: session.user.email,
        sessionId: session.id,
      },
    })

    // Set the session cookie so NextAuth recognizes the fully authenticated session
    const response = NextResponse.json({ success: true })

    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token"

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: fullSessionExpiry, // Use the updated expiry, not the old 15-minute expiry
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      )
    }

    await logger.error("Complete 2FA login API error", {
      category: "api",
      requestId,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    )
  }
}
