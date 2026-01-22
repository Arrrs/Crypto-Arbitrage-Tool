import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"

/**
 * Validate password reset token without consuming it
 * Used by reset-password page to check token validity before user types password
 *
 * This improves UX by showing "Link expired" immediately instead of after form submission
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      )
    }

    // Find reset token without deleting it
    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: {
          gt: new Date(), // Token not expired
        },
      },
    })

    if (!resetToken || !resetToken.identifier.startsWith("reset:")) {
      return NextResponse.json(
        { valid: false, error: "invalid" }, // Don't reveal if expired vs invalid
        { status: 200 } // Return 200 to prevent retry logic
      )
    }

    // Extract email from identifier
    const email = resetToken.identifier.replace("reset:", "")

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { valid: false, error: "invalid" },
        { status: 200 }
      )
    }

    // Token is valid
    return NextResponse.json({
      valid: true,
      message: "Token is valid. You can now reset your password.",
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Validate reset token error", {
      category: "auth",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { valid: false, error: "An error occurred" },
      { status: 500 }
    )
  }
}
