import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"
import { logger, logSessionActivity } from "@/lib/logger"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/email-db"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - uses system settings for maxLoginAttempts
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.PASSWORD_RESET
    const { limited, remaining, resetAt } = await checkRateLimit(
      request,
      "/api/auth/forgot-password",
      rateLimitConfig
    )

    if (limited) {
      await logger.warn("Password reset rate limit exceeded", {
        category: "security",
        metadata: {
          ip: request.headers.get("x-forwarded-for") || "unknown",
          resetAt,
        },
      })

      return NextResponse.json(
        {
          error: "Too many password reset attempts",
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

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Find user by email (case-insensitive search)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        }
      },
    })

    // Always return success to prevent email enumeration attacks
    // Don't reveal if email exists or not
    if (!user) {
      await logger.info("Password reset requested for non-existent email", {
        category: "auth",
        metadata: { email: email.toLowerCase() },
      })
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      })
    }

    // Check if user has a password (OAuth users don't)
    if (!user.password) {
      await logger.info("Password reset requested for OAuth user", {
        category: "auth",
        metadata: { email: email.toLowerCase(), userId: user.id },
      })
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Delete any existing reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: `reset:${email.toLowerCase()}`,
      },
    })

    // Store reset token
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email.toLowerCase()}`,
        token: resetToken,
        expires: resetTokenExpiry,
      },
    })

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken)

    if (!emailResult.success) {
      await logger.error("Failed to send password reset email", {
        category: "email",
        metadata: {
          userId: user.id,
          email: user.email,
          error: emailResult.error instanceof Error ? emailResult.error.message : String(emailResult.error)
        },
      })
      // Still return success message to prevent email enumeration
      // But log the error for debugging
    }

    // Log password reset request
    await logSessionActivity(user.id, "PASSWORD_RESET", {
      method: "email",
      request,
    })

    await logger.info("Password reset requested", {
      category: "auth",
      metadata: { userId: user.id, email: user.email, emailSent: emailResult.success },
    })

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link.",
    })
  } catch (error) {
    await logger.error("Forgot password error", {
      category: "auth",
      error: error as Error,
    })

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
