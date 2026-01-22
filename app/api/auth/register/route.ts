import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email-db"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"
import { logger, logSessionActivity, getRequestId } from "@/lib/logger"
import { registerSchema } from "@/lib/validation"
import { z } from "zod"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    // Rate limiting - get from database settings (default: 3 signups per hour per IP)
    const rateLimits = await getRateLimits()
    const rateLimitConfig = rateLimits.SIGNUP
    const { limited, remaining, resetAt } = await checkRateLimit(
      request,
      "/api/auth/register",
      rateLimitConfig
    )

    if (limited) {
      await logger.warn("Signup rate limit exceeded", {
        category: "security",
        metadata: {
          ip: request.headers.get("x-forwarded-for") || "unknown",
          resetAt,
        },
        requestId,
      })

      return NextResponse.json(
        {
          error: "Too many signup attempts",
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
    const { name, email, password } = registerSchema.parse(body)

    // Normalize email to lowercase (best practice)
    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    // Create user without email verification
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: null, // Not verified yet
      },
    })

    // Generate verification token
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

    // Send verification email (send to normalized email)
    const emailResult = await sendVerificationEmail(normalizedEmail, token)

    if (!emailResult.success) {
      await logger.error("Failed to send verification email", {
        category: "email",
        metadata: { email, error: emailResult.error },
        requestId,
      })
      // Don't fail registration if email fails, user can resend later
    }

    // Log successful registration
    await logger.info("New user registered", {
      category: "auth",
      metadata: { userId: user.id, email: user.email },
      userId: user.id,
      requestId,
    })

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        message: "Registration successful! Please check your email to verify your account.",
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    await logger.error("Registration error", {
      category: "auth",
      error: error as Error,
      requestId,
    })

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
