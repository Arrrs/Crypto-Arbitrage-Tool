import { prisma } from "@/lib/prisma"
import { logger } from "./logger"

/**
 * Check if a user has an active subscription
 *
 * @param userId - The user's ID
 * @returns Promise<boolean> - True if subscription is active
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPaid: true,
        paidUntil: true,
      },
    })

    if (!user) {
      return false
    }

    // Check both isPaid flag AND expiry date
    const now = new Date()
    const isActive =
      user.isPaid &&
      user.paidUntil !== null &&
      new Date(user.paidUntil) > now

    return isActive
  } catch (error) {
    await logger.error("Error checking subscription", {
      category: "system",
      metadata: {
        userId,
        error: error instanceof Error ? error.message : String(error)
      },
    })
    return false
  }
}

/**
 * Middleware function to protect premium API routes
 * Use this in API routes that require active subscription
 */
export async function requireSubscription(userId: string | undefined) {
  if (!userId) {
    return {
      error: "Unauthorized",
      status: 401,
    }
  }

  const hasSubscription = await hasActiveSubscription(userId)

  if (!hasSubscription) {
    return {
      error: "Premium subscription required",
      message: "This feature requires an active premium subscription",
      status: 403,
    }
  }

  return null // No error, subscription is active
}
