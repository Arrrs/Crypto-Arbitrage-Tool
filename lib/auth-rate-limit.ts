/**
 * Authentication Rate Limiting
 *
 * Provides IP-based rate limiting for authentication endpoints
 * to prevent brute force attacks.
 */

import { prisma } from "./prisma"
import { logger } from "./logger"

interface LoginAttempt {
  ip: string
  email?: string
  success: boolean
  timestamp: Date
}

/**
 * Get system limits from database
 */
async function getSystemLimits() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { key: "system_limits" },
    })

    if (settings?.value) {
      const value = settings.value as any
      return {
        maxLoginAttempts: value.maxLoginAttempts || 5,
        loginAttemptWindowMinutes: value.loginAttemptWindowMinutes || 15,
      }
    }
  } catch (error) {
    // If we can't read settings, use defaults
  }

  return {
    maxLoginAttempts: 5,
    loginAttemptWindowMinutes: 15,
  }
}

/**
 * Check if IP should be rate limited for login attempts
 * Returns: { blocked: boolean, remaining: number, resetAt: Date }
 */
export async function checkLoginRateLimit(
  ip: string,
  email?: string
): Promise<{
  blocked: boolean
  remaining: number
  resetAt: Date
  reason?: string
}> {
  const now = new Date()

  // Get limits from system settings
  const limits = await getSystemLimits()
  const windowMinutes = limits.loginAttemptWindowMinutes
  const maxAttempts = limits.maxLoginAttempts

  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000)

  try {
    // Count failed login attempts from this IP in the time window
    const failedAttempts = await prisma.sessionLog.count({
      where: {
        ipAddress: ip,
        event: "LOGIN",
        success: false,
        timestamp: { gte: windowStart },
      },
    })

    const remaining = Math.max(0, maxAttempts - failedAttempts)
    const blocked = failedAttempts >= maxAttempts

    // Calculate reset time
    let resetAt = new Date(now.getTime() + windowMinutes * 60 * 1000)

    if (blocked) {
      // Find the oldest failed attempt to calculate exact reset time
      const oldestAttempt = await prisma.sessionLog.findFirst({
        where: {
          ipAddress: ip,
          event: "LOGIN",
          success: false,
          timestamp: { gte: windowStart },
        },
        orderBy: { timestamp: "asc" },
      })

      if (oldestAttempt) {
        resetAt = new Date(oldestAttempt.timestamp.getTime() + windowMinutes * 60 * 1000)
      }

      // Log rate limit block
      await logger.warn("Login rate limit exceeded", {
        category: "security",
        metadata: {
          ip,
          email,
          failedAttempts,
          resetAt: resetAt.toISOString(),
        },
      })
    }

    return {
      blocked,
      remaining,
      resetAt,
      reason: blocked ? `Too many failed login attempts. Try again after ${resetAt.toISOString()}` : undefined,
    }
  } catch (error) {
    await logger.error("Error checking login rate limit", {
      category: "security",
      metadata: {
        ip,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Fail open on error - allow the request
    const limits = await getSystemLimits()
    return {
      blocked: false,
      remaining: limits.maxLoginAttempts,
      resetAt: new Date(now.getTime() + limits.loginAttemptWindowMinutes * 60 * 1000),
    }
  }
}

/**
 * Check for suspicious patterns (e.g., multiple accounts from same IP)
 */
export async function checkSuspiciousActivity(ip: string): Promise<{
  suspicious: boolean
  reason?: string
}> {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Check if IP is trying different email addresses
    const uniqueEmails = await prisma.sessionLog.groupBy({
      by: ["userId"],
      where: {
        ipAddress: ip,
        event: "LOGIN",
        success: false,
        timestamp: { gte: last24h },
      },
      _count: { userId: true },
    })

    // If trying more than 10 different accounts, flag as suspicious
    if (uniqueEmails.length > 10) {
      await logger.warn("Suspicious login activity detected", {
        category: "security",
        metadata: {
          ip,
          uniqueAccountsAttempted: uniqueEmails.length,
        },
      })

      return {
        suspicious: true,
        reason: "Account enumeration detected",
      }
    }

    return { suspicious: false }
  } catch (error) {
    await logger.error("Error checking suspicious activity", {
      category: "security",
      metadata: {
        ip,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return { suspicious: false }
  }
}

/**
 * Record a login attempt (success or failure)
 * This is already handled by logSessionActivity in auth.ts,
 * but we provide this as a backup/explicit function
 */
export async function recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
  try {
    // This is primarily handled by the auth system's logSessionActivity
    // We log additional context here for rate limiting purposes
    await logger.info(`Login attempt: ${attempt.success ? "success" : "failed"}`, {
      category: "auth",
      metadata: {
        ip: attempt.ip,
        email: attempt.email,
        success: attempt.success,
      },
    })
  } catch (error) {
    await logger.error("Failed to record login attempt", {
      category: "security",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        ip: attempt.ip,
        email: attempt.email,
      },
    })
  }
}
