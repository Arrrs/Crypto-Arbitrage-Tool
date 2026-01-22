import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { logger, getRequestId } from "@/lib/logger"
import { z } from "zod"
import { validateCsrfToken } from "@/lib/csrf"
import { requireTwoFactorVerification } from "@/lib/2fa-verification"

const disableSchema = z.object({
  password: z.string().optional(), // Optional for OAuth users
  twoFactorCode: z.string().optional(), // Alternative for OAuth users
})

/**
 * POST /api/user/2fa/disable
 * Disable 2FA for the user (requires password confirmation)
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
    const body = await request.json()
    const { password, twoFactorCode } = disableSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        password: true,
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Users with password: require password verification
    if (user.password) {
      if (!password) {
        return NextResponse.json(
          { error: "Password is required to disable 2FA" },
          { status: 400 }
        )
      }

      const isPasswordValid = await compare(password, user.password)

      if (!isPasswordValid) {
        await logger.warn("2FA disable attempt with invalid password", {
          category: "security",
          userId: user.id,
          metadata: { email: user.email },
          requestId,
        })

        return NextResponse.json(
          { error: "Invalid password" },
          { status: 400 }
        )
      }
    } else {
      // OAuth users without password: require 2FA code verification
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
            error: twoFactorResult.error || "Two-factor authentication required to disable 2FA",
            requiresTwoFactor: twoFactorResult.requiresTwoFactor,
          },
          { status: twoFactorResult.requiresTwoFactor ? 403 : 400 }
        )
      }
    }

    // Disable 2FA and remove secrets
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
        twoFactorVerified: null,
      },
    })

    await logger.info("2FA disabled", {
      category: "security",
      userId: user.id,
      metadata: { email: user.email },
      requestId,
    })

    return NextResponse.json({
      success: true,
      message: "2FA has been disabled successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    await logger.error("2FA disable error", {
      category: "security",
      error: error as Error,
      userId: session.user.id,
      requestId,
    })

    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    )
  }
}
