import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * Server-side admin authorization utility
 *
 * SECURITY: This function re-validates admin role from the DATABASE,
 * not just the JWT session. This prevents bypasses if JWT is compromised.
 */
export async function requireAdmin() {
  const session = await auth()

  // Check if user is authenticated
  if (!session?.user?.id) {
    return {
      error: "Unauthorized - Please login",
      status: 401,
    } as const
  }

  // IMPORTANT: Re-fetch user from database to verify current role
  // Don't trust JWT session.user.role alone!
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      email: true,
    },
  })

  if (!user) {
    return {
      error: "User not found",
      status: 404,
    } as const
  }

  // Verify user has ADMIN role in database
  if (user.role !== "ADMIN") {
    // Log security issue
    await logger.warn(
      `Non-admin user ${user.email} attempted to access admin endpoint`,
      {
        category: "security",
        metadata: { userId: user.id, email: user.email },
      }
    )

    return {
      error: "Forbidden - Admin access required",
      status: 403,
    } as const
  }

  // Return user data if authorized
  return {
    user,
    error: null,
    status: 200,
  } as const
}

/**
 * Log admin actions for audit trail
 * NOTE: This is now just a wrapper - use logAdminAction from logger.ts instead
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  details: Record<string, any>
) {
  // For backward compatibility - import from logger instead
  const { logAdminAction: logAction } = await import("@/lib/logger")
  await logAction(adminId, action, {
    resource: details.resource,
    resourceId: details.resourceId || details.targetUserId || details.createdUserId || details.deletedUserId,
    metadata: details,
  })
}
