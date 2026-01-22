import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Rate limit email verification attempts
    // Prevents: Token brute-force attacks, DoS attacks, database flooding
    // Industry Standard: 5 attempts per hour (same as other verification endpoints)
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.EMAIL_VERIFICATION
    const rateLimit = await checkRateLimit(
      request,
      "EMAIL_VERIFICATION",
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

    const requestId = getRequestId(request)
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token },
      })

      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      )
    }

    // Update user's emailVerified field
    const user = await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    })

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { token },
    })

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      email: user.email, // Return email for pre-filling login form
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Email verification error", {
      category: "auth",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "An error occurred during verification" },
      { status: 500 }
    )
  }
}
