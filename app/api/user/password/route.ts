import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hash, compare } from "bcryptjs"
import { passwordSchema } from "@/lib/validation"
import { z } from "zod"
import { logger, getRequestId, logSessionActivity } from "@/lib/logger"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"
import { validateCsrfToken } from "@/lib/csrf"
import { requireTwoFactorVerification } from "@/lib/2fa-verification"

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: passwordSchema,
  twoFactorCode: z.string().optional(), // For 2FA verification
})

export async function POST(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get current session token from cookie (to preserve it during password change)
  // Cookie name differs between dev and production (HTTPS)
  const sessionCookie =
    request.cookies.get("__Secure-next-auth.session-token") || // Production (HTTPS)
    request.cookies.get("next-auth.session-token") // Development (HTTP)
  const currentSessionToken = sessionCookie?.value

  try {
    const body = await request.json()
    const { currentPassword, newPassword, twoFactorCode } = updatePasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // SECURITY: Require 2FA verification for password changes (BEFORE rate limiting)
    // CRITICAL: Password changes ALWAYS require fresh 2FA (bypass grace period)
    const twoFactorResult = await requireTwoFactorVerification(
      request,
      session.user.id,
      twoFactorCode,
      currentSessionToken,
      true // bypassGracePeriod - always require fresh 2FA for password changes
    )

    if (!twoFactorResult.success) {
      return NextResponse.json(
        {
          error: twoFactorResult.error,
          requiresTwoFactor: twoFactorResult.requiresTwoFactor,
        },
        { status: twoFactorResult.requiresTwoFactor ? 403 : 400 }
      )
    }

    // Rate limiting - check AFTER 2FA verification to avoid double-counting
    // Only count actual password change attempts, not 2FA prompts
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.PASSWORD_CHANGE
    const { limited, remaining, resetAt } = await checkRateLimit(
      request,
      "/api/user/password",
      {
        ...rateLimitConfig,
        identifier: session.user.id, // Rate limit per user
      }
    )

    if (limited) {
      await logger.warn("Password change rate limit exceeded", {
        category: "security",
        userId: session.user.id,
        metadata: { resetAt },
        requestId: getRequestId(request),
      })

      return NextResponse.json(
        {
          error: "Too many password change attempts",
          message: `Please try again after ${resetAt.toISOString()}`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(rateLimitConfig.maxAttempts),
            "X-RateLimit-Remaining": String(remaining),
          },
        }
      )
    }

    // If user has no password (OAuth user), allow setting password without current password
    if (!user.password) {
      const hashedPassword = await hash(newPassword, 12)

      // Use transaction to update password and delete all OTHER sessions atomically
      await prisma.$transaction(async (tx) => {
        // Update password
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            password: hashedPassword,
          },
        })

        // Delete all OTHER sessions for this user (keep current session active)
        await tx.session.deleteMany({
          where: {
            userId: session.user.id,
            ...(currentSessionToken && {
              sessionToken: { not: currentSessionToken }
            })
          },
        })
      })

      // Log password set event
      await logSessionActivity(session.user.id, "PASSWORD_CHANGE", {
        method: "set_new",
        success: true,
        request,
      })

      await logger.info("User set password - all sessions invalidated", {
        category: "auth",
        userId: session.user.id,
        requestId: getRequestId(request),
      })

      return NextResponse.json({ message: "Password set successfully. All sessions have been logged out for security." })
    }

    // If user has password, require current password to change it
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to change your password" },
        { status: 400 }
      )
    }

    const isPasswordValid = await compare(currentPassword, user.password)

    if (!isPasswordValid) {
      // Log failed password change attempt
      await logSessionActivity(session.user.id, "PASSWORD_CHANGE", {
        method: "change",
        success: false,
        failReason: "Current password incorrect",
        request,
      })

      await logger.warn("Failed password change - incorrect current password", {
        category: "security",
        userId: session.user.id,
        requestId: getRequestId(request),
      })

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(newPassword, 12)

    // Use transaction to update password and delete all OTHER sessions atomically
    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          password: hashedPassword,
        },
      })

      // Delete all OTHER sessions for this user (keep current session active)
      await tx.session.deleteMany({
        where: {
          userId: session.user.id,
          ...(currentSessionToken && {
            sessionToken: { not: currentSessionToken }
          })
        },
      })
    })

    // Log successful password change
    await logSessionActivity(session.user.id, "PASSWORD_CHANGE", {
      method: "change",
      success: true,
      request,
    })

    await logger.info("User changed password - all sessions invalidated", {
      category: "auth",
      userId: session.user.id,
      requestId: getRequestId(request),
    })

    return NextResponse.json({ message: "Password updated successfully. All sessions have been logged out for security." })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    const requestId = getRequestId(request)
    await logger.error("Failed to change password", {
      category: "api",
      requestId,
      userId: session.user.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })

    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    )
  }
}
