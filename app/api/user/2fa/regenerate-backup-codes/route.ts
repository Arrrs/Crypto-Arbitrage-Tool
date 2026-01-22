import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateBackupCodes, hashBackupCode } from "@/lib/totp"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * POST /api/user/2fa/regenerate-backup-codes
 * Generate new backup codes (invalidates old ones)
 */
export async function POST(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const requestId = getRequestId(request)
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, twoFactorEnabled: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      )
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(8)
    const backupCodesHashed = await Promise.all(
      backupCodes.map((code) => hashBackupCode(code))
    )

    // Update user with new backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        backupCodes: backupCodesHashed,
      },
    })

    await logger.info("2FA backup codes regenerated", {
      category: "security",
      userId: user.id,
      metadata: { email: user.email },
      requestId,
    })

    return NextResponse.json({
      success: true,
      backupCodes, // Show these to user - they won't be shown again
      message: "New backup codes generated. Save them in a secure place.",
    })
  } catch (error) {
    await logger.error("2FA backup codes regeneration failed", {
      category: "security",
      error: error as Error,
      userId: session.user.id,
      requestId,
    })

    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    )
  }
}
