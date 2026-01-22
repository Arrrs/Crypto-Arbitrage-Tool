import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit email verification attempts
    // Prevents: Token brute-force attacks, DoS attacks, database flooding
    // Industry Standard: 5 attempts per hour (same as email verification)
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.EMAIL_VERIFICATION
    const rateLimit = await checkRateLimit(
      request,
      "EMAIL_CHANGE_VERIFY",
      rateLimitConfig
    )

    if (rateLimit.limited) {
      const minutesRemaining = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        {
          error: "Too many verification attempts",
          message: `Too many verification attempts. Please try again in ${minutesRemaining} minute(s).`,
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

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }

    // Find pending change by verification token
    const pendingChange = await prisma.pendingEmailChange.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!pendingChange) {
      return NextResponse.json(
        { error: "Invalid verification link" },
        { status: 400 }
      )
    }

    // Check if already cancelled
    if (pendingChange.cancelled) {
      return NextResponse.json(
        { error: "This email change has been cancelled" },
        { status: 400 }
      )
    }

    // Check if already finalized
    if (pendingChange.finalized) {
      return NextResponse.json(
        { error: "This email change has already been completed. The verification link can only be used once." },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date() > pendingChange.expiresAt) {
      return NextResponse.json(
        { error: "This verification link has expired. Please request a new email change." },
        { status: 400 }
      )
    }

    // Get current session token from cookie (to preserve it during email change)
    const currentSessionToken = request.cookies.get("next-auth.session-token")?.value ||
                                 request.cookies.get("__Secure-next-auth.session-token")?.value

    // Finalize the email change in a transaction
    // SECURITY: Check for email conflicts INSIDE transaction to prevent race conditions
    try {
      await prisma.$transaction(async (tx) => {
        // Check if new email is already taken by another user (INSIDE transaction)
        // This prevents TOCTOU (Time-Of-Check-Time-Of-Use) race conditions
        const existingUser = await tx.user.findFirst({
          where: {
            email: {
              equals: pendingChange.newEmail,
              mode: 'insensitive'
            }
          },
        })

        if (existingUser && existingUser.id !== pendingChange.userId) {
          throw new Error("EMAIL_TAKEN")
        }

        // Update user email
        await tx.user.update({
          where: { id: pendingChange.userId },
          data: {
            email: pendingChange.newEmail,
            emailVerified: new Date(),
          },
        })

        // Mark pending change as finalized
        await tx.pendingEmailChange.update({
          where: { id: pendingChange.id },
          data: {
            finalized: true,
            finalizedAt: new Date(),
          },
        })

        // SECURITY: Invalidate all OTHER sessions (keep current session active)
        // This prevents unauthorized devices from maintaining access after email change
        await tx.session.deleteMany({
          where: {
            userId: pendingChange.userId,
            ...(currentSessionToken && {
              NOT: { sessionToken: currentSessionToken }
            })
          },
        })
      })
    } catch (txError: any) {
      // Handle specific transaction errors
      if (txError.message === "EMAIL_TAKEN") {
        return NextResponse.json(
          { error: "This email address is already in use by another account" },
          { status: 400 }
        )
      }
      // Re-throw other errors to be caught by outer try-catch
      throw txError
    }

    await logger.info("Email changed successfully via verification", {
      category: "auth",
      userId: pendingChange.userId,
      metadata: {
        oldEmail: pendingChange.oldEmail,
        newEmail: pendingChange.newEmail,
      },
    })

    return NextResponse.json({
      message: "Email address updated successfully! You can now login with your new email address.",
    })
  } catch (error) {
    await logger.error("Failed to verify email change", {
      category: "api",
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      },
    })

    return NextResponse.json(
      { error: "Failed to verify email change" },
      { status: 500 }
    )
  }
}
