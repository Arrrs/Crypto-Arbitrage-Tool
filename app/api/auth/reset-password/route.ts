import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { passwordResetSchema } from "@/lib/validation"
import { z } from "zod"
import { logger, getRequestId } from "@/lib/logger"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit password reset attempts
    // Prevents: Token brute-force attacks, DoS attacks, database flooding
    // Industry Standard: 5 attempts per hour (same as email verification)
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.EMAIL_VERIFICATION
    const rateLimit = await checkRateLimit(
      request,
      "PASSWORD_RESET_VERIFY",
      rateLimitConfig
    )

    if (rateLimit.limited) {
      const minutesRemaining = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        {
          error: "Too many password reset attempts",
          message: `Too many password reset attempts. Please try again in ${minutesRemaining} minute(s).`,
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

    // Validate input with enhanced password requirements
    const validationResult = passwordResetSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    const { token, password } = validationResult.data

    // Find valid reset token
    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: {
          gt: new Date(), // Token not expired
        },
      },
    })

    if (!resetToken || !resetToken.identifier.startsWith("reset:")) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    // Extract email from identifier (format: "reset:email@example.com")
    const email = resetToken.identifier.replace("reset:", "")

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Use transaction to update password, delete reset token, and invalidate all sessions
    await prisma.$transaction(async (tx) => {
      // Update user password
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      })

      // Delete all sessions for this user (forces logout on all devices)
      await tx.session.deleteMany({
        where: { userId: user.id },
      })

      // Delete used reset token
      await tx.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: resetToken.identifier,
            token: resetToken.token,
          },
        },
      })
    })

    // Log password reset for security audit
    await logger.info("Password reset successful - all sessions invalidated", {
      category: "auth",
      userId: user.id,
      metadata: { email: user.email },
    })

    return NextResponse.json({
      message: "Password reset successfully. All sessions have been logged out for security. You can now login with your new password.",
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Reset password error", {
      category: "auth",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
