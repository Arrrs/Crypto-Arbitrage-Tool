import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { setupTwoFactor } from "@/lib/totp"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * POST /api/user/2fa/setup
 * Generate 2FA secret and QR code for user
 * Returns QR code and backup codes (shown only once)
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

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is already enabled. Please disable it first to regenerate." },
        { status: 400 }
      )
    }

    // Generate 2FA secret, QR code, and backup codes
    const {
      secret,
      qrCodeUrl,
      backupCodes,
      backupCodesHashed,
    } = await setupTwoFactor(user.email, "ArbTool")

    // Store secret and backup codes in database (but don't enable 2FA yet)
    // User must verify a token first to confirm their authenticator app is working
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        backupCodes: backupCodesHashed,
        twoFactorEnabled: false, // Will be enabled after verification
      },
    })

    await logger.info("2FA setup initiated", {
      category: "security",
      userId: user.id,
      metadata: { email: user.email },
      requestId,
    })

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      secret, // For manual entry (mobile users who can't scan QR on same device)
      backupCodes, // Show these to user - they won't be shown again
      message: "Scan the QR code with your authenticator app, then verify a code to complete setup",
    })
  } catch (error) {
    await logger.error("2FA setup failed", {
      category: "security",
      error: error as Error,
      userId: session.user.id,
      requestId,
    })

    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    )
  }
}
