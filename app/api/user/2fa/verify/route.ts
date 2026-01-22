import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { verifyTOTPToken } from "@/lib/totp"
import { logger, getRequestId } from "@/lib/logger"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"
import { z } from "zod"
import { validateCsrfToken } from "@/lib/csrf"

const verifySchema = z.object({
  token: z.string().length(6, "Token must be 6 digits").regex(/^\d{6}$/, "Token must be numeric"),
})

/**
 * POST /api/user/2fa/verify
 * Verify TOTP token and enable 2FA
 */
export async function POST(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const requestId = getRequestId(request)
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limiting - get limits from database settings (defaults to 10 attempts per 15 minutes)
  const rateLimits = await getRateLimits()
  const rateLimitConfig = rateLimits.TWO_FA_SETUP
  const { limited, remaining, resetAt} = await checkRateLimit(
    request,
    "/api/user/2fa/verify",
    {
      ...rateLimitConfig,
      identifier: session.user.id, // Rate limit per user, not IP
    }
  )

  if (limited) {
    await logger.warn("2FA verification rate limit exceeded", {
      category: "security",
      userId: session.user.id,
      metadata: { resetAt },
      requestId,
    })

    return NextResponse.json(
      {
        error: "Too many verification attempts",
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

  try {
    const body = await request.json()
    const { token } = verifySchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, twoFactorSecret: true, twoFactorEnabled: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA not set up. Please set up 2FA first." },
        { status: 400 }
      )
    }

    // Verify the token
    const isValid = verifyTOTPToken(user.twoFactorSecret, token)

    if (!isValid) {
      await logger.warn("2FA verification failed - invalid token", {
        category: "security",
        userId: user.id,
        metadata: { email: user.email },
        requestId,
      })

      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      )
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorVerified: new Date(),
      },
    })

    await logger.info("2FA enabled successfully", {
      category: "security",
      userId: user.id,
      metadata: { email: user.email },
      requestId,
    })

    return NextResponse.json({
      success: true,
      message: "2FA has been enabled successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    await logger.error("2FA verification error", {
      category: "security",
      error: error as Error,
      userId: session.user.id,
      requestId,
    })

    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    )
  }
}
