/**
 * 2FA Verification Utility for Sensitive Actions
 *
 * Industry-standard approach: Require 2FA for sensitive operations
 * even if user is already logged in.
 */

import { prisma } from "./prisma"
import { verifyTOTPToken, verifyBackupCode } from "./totp"
import { checkRateLimit, getRateLimits } from "./rate-limit"
import { logger } from "./logger"
import { NextRequest } from "next/server"

export interface TwoFactorVerificationResult {
  success: boolean
  error?: string
  requiresTwoFactor?: boolean
}

/**
 * Check if user has 2FA enabled
 */
export async function userHas2FA(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  })
  return user?.twoFactorEnabled || false
}

/**
 * Check if user recently verified 2FA (grace period)
 * Grace period: 10 minutes
 */
export async function checkTwoFactorGracePeriod(userId: string): Promise<boolean> {
  const gracePeriodMinutes = 10
  const gracePeriodMs = gracePeriodMinutes * 60 * 1000

  // Check if there's a recent 2FA verification in session metadata
  const recentVerification = await prisma.session.findFirst({
    where: {
      userId,
      twoFactorVerifiedAt: {
        gte: new Date(Date.now() - gracePeriodMs),
      },
    },
    orderBy: {
      twoFactorVerifiedAt: "desc",
    },
  })

  return !!recentVerification
}

/**
 * Set 2FA grace period for user's sessions
 */
export async function setTwoFactorGracePeriod(userId: string, sessionToken: string): Promise<void> {
  // Update the current session with 2FA verification timestamp
  await prisma.session.updateMany({
    where: {
      userId,
      sessionToken,
    },
    data: {
      twoFactorVerifiedAt: new Date(),
    },
  })
}

/**
 * Verify TOTP code or backup code
 */
async function verifyCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorSecret: true,
      backupCodes: true,
    },
  })

  if (!user) return false

  // Try TOTP first
  if (user.twoFactorSecret) {
    const isValidTOTP = verifyTOTPToken(user.twoFactorSecret, code)

    if (isValidTOTP) {
      await logger.info("2FA verification successful (TOTP)", {
        category: "security",
        userId,
      })
      return true
    }
  }

  // Try backup codes
  if (user.backupCodes && user.backupCodes.length > 0) {
    const backupCodes = user.backupCodes as string[]

    // Check each backup code hash
    for (let i = 0; i < backupCodes.length; i++) {
      const isValidBackupCode = await verifyBackupCode(code, backupCodes[i])

      if (isValidBackupCode) {
        // Remove used backup code
        const updatedCodes = backupCodes.filter((_, index) => index !== i)
        await prisma.user.update({
          where: { id: userId },
          data: { backupCodes: updatedCodes },
        })

        await logger.info("2FA verification successful (backup code)", {
          category: "security",
          userId,
          metadata: { remainingBackupCodes: updatedCodes.length },
        })
        return true
      }
    }
  }

  return false
}

/**
 * Require 2FA verification for sensitive actions
 *
 * @param request - Next.js request object (for rate limiting)
 * @param userId - User ID
 * @param providedCode - 2FA code provided by user (optional)
 * @param sessionToken - Current session token (for grace period)
 * @param bypassGracePeriod - Force 2FA verification even within grace period (for critical actions like password changes)
 * @returns Verification result
 */
export async function requireTwoFactorVerification(
  request: NextRequest,
  userId: string,
  providedCode?: string,
  sessionToken?: string,
  bypassGracePeriod: boolean = false
): Promise<TwoFactorVerificationResult> {
  // Check if user has 2FA enabled
  const has2FA = await userHas2FA(userId)

  if (!has2FA) {
    // 2FA not enabled, allow action
    return { success: true }
  }

  // Check grace period (user recently verified 2FA)
  // SECURITY: For critical actions like password changes, always require fresh 2FA
  const inGracePeriod = bypassGracePeriod ? false : await checkTwoFactorGracePeriod(userId)

  if (inGracePeriod) {
    return { success: true }
  }

  // 2FA is required
  if (!providedCode) {
    return {
      success: false,
      requiresTwoFactor: true,
      error: "Two-factor authentication code required",
    }
  }

  // Rate limiting for 2FA verification
  const rateLimits = await getRateLimits()
  const { limited, remaining, resetAt } = await checkRateLimit(
    request,
    "/api/2fa-verify-action",
    {
      ...rateLimits.TWO_FACTOR_VERIFY,
      identifier: userId, // Per-user rate limiting
    }
  )

  if (limited) {
    await logger.warn("2FA verification rate limit exceeded", {
      category: "security",
      userId,
      metadata: { resetAt: resetAt.toISOString() },
    })

    return {
      success: false,
      error: `Too many failed attempts. Try again after ${resetAt.toLocaleTimeString()}`,
    }
  }

  // Verify the code
  const isValid = await verifyCode(userId, providedCode)

  if (!isValid) {
    await logger.warn("2FA verification failed", {
      category: "security",
      userId,
      metadata: { remainingAttempts: remaining - 1 },
    })

    return {
      success: false,
      error: "Invalid authentication code",
    }
  }

  // Success! Set grace period
  if (sessionToken) {
    await setTwoFactorGracePeriod(userId, sessionToken)
  }

  await logger.info("2FA verification successful for sensitive action", {
    category: "security",
    userId,
  })

  return { success: true }
}
