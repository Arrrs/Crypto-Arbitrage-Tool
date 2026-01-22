import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyTOTPToken, verifyBackupCode } from "@/lib/totp"
import { logger, getRequestId, logSessionActivity } from "@/lib/logger"
import { signIn } from "@/auth"
import { z } from "zod"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"

const verify2FASchema = z.object({
  userId: z.string(),
  code: z.string().min(6, "Code must be at least 6 characters"),
  isBackupCode: z.boolean().optional().default(false),
})

/**
 * POST /api/auth/verify-2fa
 * Verify 2FA code during login process
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    const body = await request.json()
    const { userId, code, isBackupCode } = verify2FASchema.parse(body)

    // Rate limiting - prevent TOTP brute-force attacks
    // Use userId as identifier to rate limit per user
    const rateLimits = await getRateLimits()
    const rateLimit = rateLimits.TWO_FACTOR_VERIFY
    const { limited, remaining, resetAt } = await checkRateLimit(
      request,
      "/api/auth/verify-2fa",
      {
        ...rateLimit,
        identifier: userId, // Rate limit per user, not IP
      }
    )

    if (limited) {
      await logger.warn("2FA verification rate limit exceeded", {
        category: "security",
        userId,
        metadata: { resetAt },
        requestId,
      })

      return NextResponse.json(
        {
          error: "Too many failed attempts",
          message: `Please try again after ${resetAt.toISOString()}`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(rateLimit.maxAttempts),
            "X-RateLimit-Remaining": String(remaining),
          },
        }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
        backupCodes: true,
      },
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA not configured" },
        { status: 400 }
      )
    }

    let isValid = false

    if (isBackupCode) {
      // Verify backup code
      for (let i = 0; i < user.backupCodes.length; i++) {
        const hash = user.backupCodes[i]
        const matches = await verifyBackupCode(code, hash)

        if (matches) {
          isValid = true

          // Remove used backup code
          const newBackupCodes = user.backupCodes.filter((_, index) => index !== i)
          await prisma.user.update({
            where: { id: user.id },
            data: { backupCodes: newBackupCodes },
          })

          await logger.warn("2FA backup code used", {
            category: "security",
            userId: user.id,
            metadata: {
              email: user.email,
              remainingCodes: newBackupCodes.length,
            },
            requestId,
          })

          break
        }
      }
    } else {
      // Verify TOTP token
      isValid = verifyTOTPToken(user.twoFactorSecret, code)
    }

    if (!isValid) {
      await logSessionActivity(user.id, "LOGIN", {
        success: false,
        failReason: isBackupCode ? "Invalid backup code" : "Invalid 2FA code",
        method: "credentials",
        request,
      })

      return NextResponse.json(
        { error: isBackupCode ? "Invalid or already used backup code" : "Invalid verification code" },
        { status: 400 }
      )
    }

    // Log successful 2FA verification
    await logSessionActivity(user.id, "LOGIN", {
      success: true,
      method: "credentials_with_2fa",
      request,
    })

    return NextResponse.json({
      success: true,
      message: "2FA verification successful",
      userId: user.id,
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
      requestId,
    })

    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}
