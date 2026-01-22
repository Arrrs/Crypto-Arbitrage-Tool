import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logRateLimit, logger } from "@/lib/logger"

/**
 * Rate Limiting Utility
 *
 * Implements sliding window rate limiting with database tracking.
 * Prevents abuse of API endpoints.
 */

interface RateLimitConfig {
  windowMinutes: number // Time window in minutes
  maxAttempts: number   // Maximum attempts allowed in window
  identifier?: string   // Custom identifier (defaults to IP)
}

/**
 * Get system settings from database
 */
async function getSystemLimits() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { key: "system_limits" },
    })

    if (settings?.value) {
      return settings.value as {
        maxFileUploadMB?: number
        maxAvatarSizeMB?: number
        rateLimitPerMinute?: number
        maxLoginAttempts?: number
        loginAttemptWindowMinutes?: number
        maxPasswordResetAttempts?: number
        passwordResetWindowMinutes?: number
        maxPasswordChangeAttempts?: number
        passwordChangeWindowMinutes?: number
        max2FASetupAttempts?: number
        twoFASetupWindowMinutes?: number
        max2FAVerifyAttempts?: number
        twoFAVerifyWindowMinutes?: number
        maxEmailChangeAttempts?: number
        emailChangeWindowMinutes?: number
        maxSignupAttempts?: number
        signupWindowMinutes?: number
        maxEmailVerificationAttempts?: number
        emailVerificationWindowMinutes?: number
        maxAdminWriteAttempts?: number
        adminWriteWindowMinutes?: number
        maxAdminReadAttempts?: number
        adminReadWindowMinutes?: number
        maxApiWriteAttempts?: number
        apiWriteWindowMinutes?: number
        maxFileUploadAttempts?: number
        fileUploadWindowMinutes?: number
        sessionTimeoutMinutes?: number
      }
    }
  } catch (error) {
    // If we can't read settings, use defaults
  }

  // Return defaults if settings not found
  return {
    maxFileUploadMB: 5,
    maxAvatarSizeMB: 2,
    rateLimitPerMinute: 60,
    maxLoginAttempts: 5,
    loginAttemptWindowMinutes: 15,
    maxPasswordResetAttempts: 3,
    passwordResetWindowMinutes: 60,
    maxPasswordChangeAttempts: 10,
    passwordChangeWindowMinutes: 60,
    max2FASetupAttempts: 10,
    twoFASetupWindowMinutes: 15,
    max2FAVerifyAttempts: 5,
    twoFAVerifyWindowMinutes: 15,
    maxEmailChangeAttempts: 3,
    emailChangeWindowMinutes: 1440, // 24 hours
    maxSignupAttempts: 3,
    signupWindowMinutes: 60,
    maxEmailVerificationAttempts: 5,
    emailVerificationWindowMinutes: 60,
    maxAdminWriteAttempts: 30,
    adminWriteWindowMinutes: 1,
    maxAdminReadAttempts: 100,
    adminReadWindowMinutes: 1,
    maxApiWriteAttempts: 30,
    apiWriteWindowMinutes: 1,
    maxFileUploadAttempts: 10,
    fileUploadWindowMinutes: 60,
    sessionTimeoutMinutes: 60,
  }
}

/**
 * Check if request should be rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
  const { windowMinutes, maxAttempts, identifier: customIdentifier } = config

  // Get identifier (IP address or custom)
  const identifier = customIdentifier ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"

  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000)

  try {
    // Count attempts in current window
    const recentAttempts = await prisma.rateLimitLog.findMany({
      where: {
        identifier,
        endpoint,
        timestamp: { gte: windowStart },
      },
    })

    const totalAttempts = recentAttempts.reduce(
      (sum, log) => sum + log.attempts,
      0
    )

    // Check if this NEW attempt would exceed the limit
    // totalAttempts is the count BEFORE this request
    // We need to check if totalAttempts + 1 > maxAttempts
    const limited = totalAttempts >= maxAttempts

    // Only log the attempt if we're going to process the request
    // This prevents overcounting when a request is blocked
    if (!limited) {
      // Log this successful attempt
      await logRateLimit(identifier, endpoint, {
        blocked: false,
        windowMinutes,
      })
    } else {
      // Log as blocked without incrementing counter
      await logger.warn(`Rate limit exceeded: ${endpoint}`, {
        category: "security",
        metadata: { identifier, endpoint, totalAttempts, maxAttempts },
      })
    }

    const remaining = Math.max(0, maxAttempts - totalAttempts - (limited ? 0 : 1))

    // Calculate reset time
    const oldestAttempt = recentAttempts.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )[0]
    const resetAt = oldestAttempt
      ? new Date(oldestAttempt.timestamp.getTime() + windowMinutes * 60 * 1000)
      : new Date(now.getTime() + windowMinutes * 60 * 1000)

    return { limited, remaining, resetAt }
  } catch (error) {
    await logger.error("Error checking rate limit", {
      category: "security",
      metadata: {
        identifier,
        error: error instanceof Error ? error.message : String(error)
      },
    })
    // On error, allow the request (fail open)
    return {
      limited: false,
      remaining: maxAttempts,
      resetAt: new Date(now.getTime() + windowMinutes * 60 * 1000),
    }
  }
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest) => {
    const endpoint = request.nextUrl.pathname

    const { limited, remaining, resetAt } = await checkRateLimit(
      request,
      endpoint,
      config
    )

    if (limited) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Try again after ${resetAt.toISOString()}`,
          retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(config.maxAttempts),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": resetAt.toISOString(),
          },
        }
      )
    }

    // Add rate limit headers to response
    const response = await handler(request)

    response.headers.set("X-RateLimit-Limit", String(config.maxAttempts))
    response.headers.set("X-RateLimit-Remaining", String(remaining))
    response.headers.set("X-RateLimit-Reset", resetAt.toISOString())

    return response
  }
}

/**
 * Get rate limit configurations from system settings
 * Falls back to defaults if settings not found
 */
export async function getRateLimits() {
  const limits = await getSystemLimits()

  return {
    // Auth endpoints - use system settings
    LOGIN: {
      windowMinutes: limits.loginAttemptWindowMinutes || 15,
      maxAttempts: limits.maxLoginAttempts || 5,
    },
    SIGNUP: {
      windowMinutes: limits.signupWindowMinutes || 60,
      maxAttempts: limits.maxSignupAttempts || 3,
    },
    PASSWORD_RESET: {
      windowMinutes: limits.passwordResetWindowMinutes || 60,
      maxAttempts: limits.maxPasswordResetAttempts || 3,
    },
    PASSWORD_CHANGE: {
      windowMinutes: limits.passwordChangeWindowMinutes || 60,
      maxAttempts: limits.maxPasswordChangeAttempts || 10,
    },
    EMAIL_VERIFICATION: {
      windowMinutes: limits.emailVerificationWindowMinutes || 60,
      maxAttempts: limits.maxEmailVerificationAttempts || 5,
    },
    // 2FA setup verification - use system settings
    TWO_FA_SETUP: {
      windowMinutes: limits.twoFASetupWindowMinutes || 15,
      maxAttempts: limits.max2FASetupAttempts || 10,
    },
    // 2FA login verification - strict to prevent TOTP brute-force
    TWO_FACTOR_VERIFY: {
      windowMinutes: limits.twoFAVerifyWindowMinutes || 15,
      maxAttempts: limits.max2FAVerifyAttempts || 5,
    },
    // Email change - prevent abuse
    EMAIL_CHANGE: {
      windowMinutes: limits.emailChangeWindowMinutes || 1440,
      maxAttempts: limits.maxEmailChangeAttempts || 3,
    },

    // Admin endpoints - configurable limits
    ADMIN_WRITE: {
      windowMinutes: limits.adminWriteWindowMinutes || 1,
      maxAttempts: limits.maxAdminWriteAttempts || 30,
    },
    ADMIN_READ: {
      windowMinutes: limits.adminReadWindowMinutes || 1,
      maxAttempts: limits.maxAdminReadAttempts || 100,
    },

    // API endpoints - configurable limits
    API_READ: {
      windowMinutes: 1,
      maxAttempts: limits.rateLimitPerMinute || 60,
    },
    API_WRITE: {
      windowMinutes: limits.apiWriteWindowMinutes || 1,
      maxAttempts: limits.maxApiWriteAttempts || 30,
    },

    // File upload - configurable limit
    FILE_UPLOAD: {
      windowMinutes: limits.fileUploadWindowMinutes || 60,
      maxAttempts: limits.maxFileUploadAttempts || 10,
    },
  }
}
