import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail, sendEmailChangeNotification, sendEmailChangeVerification } from "@/lib/email-db"
import { hash } from "bcryptjs"
import { z } from "zod"
import crypto from "crypto"
import { logger, getRequestId } from "@/lib/logger"
import { trackPageView, trackFeatureUse } from "@/lib/analytics"
import { getGeoLocation } from "@/lib/geolocation"
import { validateCsrfToken, setCsrfTokenCookie } from "@/lib/csrf"
import { checkRateLimit, getRateLimits } from "@/lib/rate-limit"
import { requireTwoFactorVerification } from "@/lib/2fa-verification"

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  twoFactorCode: z.string().optional(), // For 2FA verification
})

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Track page view for profile access
  const userAgent = request.headers.get("user-agent")
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip")
  const geo = await getGeoLocation(ip)

  await trackPageView({
    userId: session.user.id,
    path: "/profile",
    userAgent,
    ipAddress: ip,
    country: geo.country,
    city: geo.city,
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      adminVerified: true,
      isPaid: true,
      paidUntil: true,
      createdAt: true,
      password: true, // Include to check if user has password (we'll send boolean, not the hash)
      twoFactorEnabled: true,
      twoFactorVerified: true,
      backupCodes: true, // Include to count remaining backup codes
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Don't send the actual password hash or backup codes to the client
  const { password, backupCodes, ...userWithoutSensitiveData } = user

  const response = NextResponse.json({
    user: {
      ...userWithoutSensitiveData,
      hasPassword: !!password, // Send boolean instead of hash
      backupCodesCount: backupCodes?.length || 0, // Send count instead of actual codes
    },
  })
  setCsrfTokenCookie(response, request)
  return response
}

export async function PATCH(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, email, twoFactorCode } = updateProfileSchema.parse(body)

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updateData: { name?: string; email?: string; emailVerified?: null } = {}
    let emailChanged = false
    let newEmail = ""

    if (name) updateData.name = name

    if (email && email !== currentUser.email) {
      // Check rate limiting for email changes (per user)
      const rateLimits = await getRateLimits()
      const rateLimitConfig = rateLimits.EMAIL_CHANGE
      const { limited, remaining, resetAt } = await checkRateLimit(
        request,
        "/api/user/profile/email-change",
        {
          ...rateLimitConfig,
          identifier: session.user.id, // Rate limit per user, not IP
        }
      )

      if (limited) {
        return NextResponse.json(
          {
            error: "Too many email change attempts",
            message: `You can only change your email ${rateLimitConfig.maxAttempts} times per ${rateLimitConfig.windowMinutes / 60} hours. Please try again after ${resetAt.toISOString()}`,
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

      // SECURITY: Require 2FA verification for email changes
      const sessionToken = request.cookies.get("next-auth.session-token")?.value ||
                          request.cookies.get("__Secure-next-auth.session-token")?.value

      const twoFactorResult = await requireTwoFactorVerification(
        request,
        session.user.id,
        twoFactorCode,
        sessionToken
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

      // Normalize email for case-insensitive comparison
      const normalizedEmail = email.toLowerCase().trim()

      // Check if new email is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive'
          }
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "This email is already in use" },
          { status: 400 }
        )
      }

      // Check if new email is pending for ANOTHER user
      const pendingForAnotherUser = await prisma.pendingEmailChange.findFirst({
        where: {
          newEmail: normalizedEmail,
          userId: { not: session.user.id },
          finalized: false,
          cancelled: false,
          expiresAt: { gte: new Date() },
        },
      })

      if (pendingForAnotherUser) {
        return NextResponse.json(
          { error: "This email is already pending verification for another account" },
          { status: 400 }
        )
      }

      // Check if there's already a pending email change for this user
      const existingPendingChange = await prisma.pendingEmailChange.findFirst({
        where: {
          userId: session.user.id,
          finalized: false,
          cancelled: false,
          expiresAt: { gte: new Date() },
        },
      })

      // If there's an existing pending change, cancel it automatically
      // This allows users to correct typos or change their mind
      if (existingPendingChange) {
        await prisma.pendingEmailChange.update({
          where: { id: existingPendingChange.id },
          data: {
            cancelled: true,
            cancelledAt: new Date(),
          },
        })

        await logger.info("Previous pending email change cancelled (replaced by new request)", {
          category: "security",
          userId: session.user.id,
          metadata: {
            oldPendingEmail: existingPendingChange.newEmail,
            newPendingEmail: normalizedEmail,
          },
        })
      }

      // Create pending email change instead of changing email immediately
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const verificationToken = crypto.randomBytes(32).toString("hex")
      const cancelToken = crypto.randomBytes(32).toString("hex")

      await prisma.pendingEmailChange.create({
        data: {
          userId: session.user.id,
          oldEmail: currentUser.email,
          newEmail: normalizedEmail,
          token: verificationToken,
          cancelToken,
          expiresAt,
        },
      })

      emailChanged = true
      newEmail = normalizedEmail

      // Send verification email to NEW address
      await sendEmailChangeVerification(normalizedEmail, verificationToken)

      // SECURITY: Send notification with cancel link to OLD email address
      try {
        await sendEmailChangeNotification(
          currentUser.email,
          normalizedEmail,
          cancelToken,
          currentUser.name || undefined
        )
        await logger.info("Email change security notification sent", {
          category: "security",
          userId: session.user.id,
          metadata: {
            oldEmail: currentUser.email,
            newEmail: normalizedEmail,
          },
        })
      } catch (error) {
        // Don't fail the email change if notification fails
        await logger.error("Failed to send email change notification", {
          category: "email",
          userId: session.user.id,
          metadata: {
            error: error instanceof Error ? error.message : String(error)
          },
        })
      }

      // DON'T update user email or invalidate sessions yet
      // Email will be updated only after verification
      // This prevents account takeover if email change was unauthorized
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
      },
    })

    // Track profile update feature usage
    await trackFeatureUse({
      userId: session.user.id,
      featureName: "Profile_Update",
      action: emailChanged ? "EMAIL_CHANGED" : "NAME_CHANGED",
      metadata: {
        nameChanged: !!name,
        emailChanged,
      },
    })

    return NextResponse.json({
      user,
      emailChanged,
      message: emailChanged
        ? "Email change initiated! We've sent a verification link to your new email address and a security notification to your current email. You can still login with your current email for the next 24 hours. Your email will be updated once you verify the new address."
        : "Profile updated successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    const requestId = getRequestId(request)
    await logger.error("Profile update error", {
      category: "api",
      requestId,
      userId: session.user.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
