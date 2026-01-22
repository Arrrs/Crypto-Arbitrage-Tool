import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkLoginRateLimit } from "@/lib/auth-rate-limit"
import { logger, getRequestId, logSessionActivity } from "@/lib/logger"
import { getClientIP } from "@/lib/geolocation"
import { z } from "zod"
import { randomBytes } from "crypto"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  const ip = getClientIP(request) || "unknown"

  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Normalize email for case-insensitive lookup
    const normalizedEmail = email.toLowerCase().trim()

    // Check rate limiting BEFORE attempting login
    const rateLimitCheck = await checkLoginRateLimit(ip, normalizedEmail)

    if (rateLimitCheck.blocked) {
      const secondsRemaining = Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 1000)
      const minutesRemaining = Math.ceil(secondsRemaining / 60)

      const timeMessage = minutesRemaining > 1
        ? `${minutesRemaining} minutes`
        : secondsRemaining > 60
          ? "1 minute"
          : `${secondsRemaining} seconds`

      await logger.warn("Login blocked by rate limit", {
        category: "security",
        requestId,
        metadata: {
          ip,
          email,
          remaining: rateLimitCheck.remaining,
          resetAt: rateLimitCheck.resetAt.toISOString(),
          minutesRemaining,
        },
      })

      return NextResponse.json(
        {
          error: "Too many failed login attempts",
          message: `Too many failed login attempts. Please try again in ${timeMessage}.`,
          retryAfter: secondsRemaining,
          minutesRemaining,
        },
        { status: 429 }
      )
    }

    // Try to find user (to get userId for logging)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    // Verify credentials manually (since we're using database sessions)
    let dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // SECURITY: Check if this email is an OLD email in a pending email change (grace period)
    // This allows users to login with their old email for 24 hours during email transition
    if (!dbUser) {
      const pendingChange = await prisma.pendingEmailChange.findFirst({
        where: {
          oldEmail: normalizedEmail,
          finalized: false,
          cancelled: false,
          expiresAt: { gte: new Date() },
        },
        include: { user: true },
      })

      if (pendingChange) {
        dbUser = pendingChange.user
        user = { id: pendingChange.user.id }
      }
    }

    if (!dbUser || !dbUser.password) {
      // Log failed login attempt
      if (user) {
        await logSessionActivity(user.id, "LOGIN", {
          method: "credentials",
          success: false,
          failReason: "Invalid credentials",
          request,
        })
      }

      await logger.warn("Failed login attempt - user not found", {
        category: "security",
        requestId,
        metadata: { ip, email: normalizedEmail },
      })

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const bcrypt = await import("bcryptjs")
    const isPasswordValid = await bcrypt.compare(password, dbUser.password)

    if (!isPasswordValid) {
      // Log failed login attempt
      await logSessionActivity(dbUser.id, "LOGIN", {
        method: "credentials",
        success: false,
        failReason: "Invalid credentials",
        request,
      })

      await logger.warn("Failed login attempt - invalid password", {
        category: "security",
        requestId,
        metadata: { ip, email: normalizedEmail, userId: dbUser.id },
      })

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!dbUser.emailVerified && !dbUser.adminVerified) {
      return NextResponse.json(
        { error: "email_not_verified", message: "Please verify your email before signing in. Check your inbox for the verification link." },
        { status: 403 }
      )
    }

    // Create database session manually (credentials provider limitation with db sessions)
    const sessionToken = randomBytes(32).toString("hex")
    const sessionMaxAgeDays = parseInt(process.env.SESSION_MAX_AGE_DAYS || "30", 10)
    const sessionExpiry = new Date(Date.now() + sessionMaxAgeDays * 24 * 60 * 60 * 1000)

    // Capture session metadata
    const userAgent = request.headers.get("user-agent") || undefined
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     request.headers.get("x-real-ip") ||
                     ip

    // Get geolocation (rate-limited, graceful degradation)
    let country: string | undefined = undefined
    let city: string | undefined = undefined

    try {
      const { getGeoLocationSafe } = await import("@/lib/geolocation-safe")
      const geo = await getGeoLocationSafe(ipAddress || null)
      country = geo.country || undefined
      city = geo.city || undefined
    } catch (error) {
      // Silently fail - geolocation is not critical
      console.warn("[Login] Failed to get geolocation:", error instanceof Error ? error.message : String(error))
    }

    // For 2FA users, create a partial session that expires in 15 minutes
    // For non-2FA users, create a full session with normal expiry
    const sessionExpiryForThisUser = dbUser.twoFactorEnabled
      ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutes for partial 2FA session
      : sessionExpiry // Full 30-day expiry for non-2FA users

    await prisma.session.create({
      data: {
        sessionToken,
        userId: dbUser.id,
        expires: sessionExpiryForThisUser,
        userAgent,
        ipAddress,
        country,
        city,
        // For users without 2FA, session is fully verified immediately
        // For users with 2FA, this stays false until they complete 2FA
        twoFactorVerified: !dbUser.twoFactorEnabled,
      },
    })

    // Check if 2FA is enabled AFTER creating session
    // The session is created but with twoFactorVerified=false
    // User needs to complete 2FA to upgrade it to fully authenticated
    if (dbUser.twoFactorEnabled) {
      return NextResponse.json(
        {
          error: "2fa_required",
          userId: dbUser.id,
          sessionToken, // Return sessionToken for 2FA completion
        },
        { status: 200 }
      )
    }

    // Log successful login
    await logSessionActivity(dbUser.id, "LOGIN", {
      method: "credentials",
      success: true,
      request,
    })

    await logger.info(`User logged in: ${normalizedEmail}`, {
      category: "auth",
      requestId,
      metadata: { userId: dbUser.id, method: "credentials" },
    })

    // Set session cookie
    const response = NextResponse.json({ success: true })

    // Set NextAuth session cookie
    // In development (non-secure), NextAuth uses "__Secure-next-auth.session-token" without the __Secure prefix
    // In production (secure), it uses "__Secure-next-auth.session-token"
    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token"

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: sessionExpiry,
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      )
    }

    await logger.error("Login API error", {
      category: "api",
      requestId,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    )
  }
}
