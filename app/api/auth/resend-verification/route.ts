import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email-db"
import crypto from "crypto"
import { logger, getRequestId } from "@/lib/logger"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const requestId = getRequestId(request)

    // Rate limiting - uses system settings
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.EMAIL_VERIFICATION
    const { limited, remaining, resetAt } = await checkRateLimit(
      request,
      "/api/auth/resend-verification",
      rateLimitConfig
    )

    if (limited) {
      await logger.warn("Email verification resend rate limit exceeded", {
        category: "security",
        metadata: {
          ip: request.headers.get("x-forwarded-for") || "unknown",
          resetAt,
        },
        requestId,
      })

      return NextResponse.json(
        {
          error: "Too many verification email requests",
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

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Normalize email for case-insensitive lookup
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({
        message: "If the email exists and is unverified, a verification link will be sent.",
      })
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      )
    }

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    })

    // Generate new verification token
    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store verification token in database
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    })

    // Send verification email
    const emailResult = await sendVerificationEmail(normalizedEmail, token)

    if (!emailResult.success) {
      const requestId = getRequestId(request)
      await logger.error("Failed to send verification email", {
        category: "auth",
        requestId,
        metadata: { email: normalizedEmail, error: emailResult.error },
      })
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Verification email sent successfully. Please check your inbox.",
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Resend verification error", {
      category: "auth",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "An error occurred while resending verification email" },
      { status: 500 }
    )
  }
}
