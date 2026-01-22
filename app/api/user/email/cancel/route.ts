import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"

/**
 * GET /api/user/email/cancel
 * Get pending email change details for cancellation preview
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cancelToken = searchParams.get("cancelToken")

    if (!cancelToken) {
      return NextResponse.json(
        { error: "Cancel token is required" },
        { status: 400 }
      )
    }

    // Find pending change by cancel token
    const pendingChange = await prisma.pendingEmailChange.findUnique({
      where: { cancelToken },
    })

    if (!pendingChange) {
      return NextResponse.json(
        { error: "Invalid cancellation link" },
        { status: 400 }
      )
    }

    // Check if already cancelled
    if (pendingChange.cancelled) {
      return NextResponse.json(
        { error: "This email change has already been cancelled" },
        { status: 400 }
      )
    }

    // Check if already finalized
    if (pendingChange.finalized) {
      return NextResponse.json(
        { error: "This email change has already been completed and cannot be cancelled" },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date() > pendingChange.expiresAt) {
      return NextResponse.json(
        { error: "This cancellation link has expired" },
        { status: 400 }
      )
    }

    // Mask emails for privacy (show first 2 chars + domain)
    const maskEmail = (email: string) => {
      const [localPart, domain] = email.split("@")
      if (localPart.length <= 2) {
        return `${localPart}***@${domain}`
      }
      return `${localPart.substring(0, 2)}***@${domain}`
    }

    return NextResponse.json({
      oldEmail: maskEmail(pendingChange.oldEmail),
      newEmail: maskEmail(pendingChange.newEmail),
      expiresAt: pendingChange.expiresAt,
    })
  } catch (error) {
    await logger.error("Failed to fetch pending email change", {
      category: "api",
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      },
    })

    return NextResponse.json(
      { error: "Failed to fetch email change details" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit cancellation attempts
    // Prevents: DoS attacks, database flooding, log spam
    // Industry Standard: 5 attempts per hour (same as email verification)
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.EMAIL_VERIFICATION
    const rateLimit = await checkRateLimit(
      request,
      "EMAIL_CHANGE_CANCEL",
      rateLimitConfig
    )

    if (rateLimit.limited) {
      const minutesRemaining = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        {
          error: "Too many cancellation attempts",
          message: `Too many cancellation attempts. Please try again in ${minutesRemaining} minute(s).`,
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

    const { cancelToken } = await request.json()

    if (!cancelToken) {
      return NextResponse.json(
        { error: "Cancel token is required" },
        { status: 400 }
      )
    }

    // Find pending change by cancel token
    const pendingChange = await prisma.pendingEmailChange.findUnique({
      where: { cancelToken },
      include: { user: true },
    })

    if (!pendingChange) {
      return NextResponse.json(
        { error: "Invalid cancellation link" },
        { status: 400 }
      )
    }

    // Check if already cancelled or finalized
    if (pendingChange.cancelled) {
      return NextResponse.json(
        { error: "This email change has already been cancelled" },
        { status: 400 }
      )
    }

    if (pendingChange.finalized) {
      return NextResponse.json(
        { error: "This email change has already been completed and cannot be cancelled" },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date() > pendingChange.expiresAt) {
      return NextResponse.json(
        { error: "This cancellation link has expired" },
        { status: 400 }
      )
    }

    // Cancel the email change
    await prisma.pendingEmailChange.update({
      where: { id: pendingChange.id },
      data: {
        cancelled: true,
        cancelledAt: new Date(),
      },
    })

    await logger.info("Email change cancelled by user", {
      category: "security",
      userId: pendingChange.userId,
      metadata: {
        oldEmail: pendingChange.oldEmail,
        newEmail: pendingChange.newEmail,
      },
    })

    return NextResponse.json({
      message: "Email change cancelled successfully. Your email address remains unchanged.",
      oldEmail: pendingChange.oldEmail,
      newEmail: pendingChange.newEmail,
    })
  } catch (error) {
    await logger.error("Failed to cancel email change", {
      category: "api",
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      },
    })

    return NextResponse.json(
      { error: "Failed to cancel email change" },
      { status: 500 }
    )
  }
}
