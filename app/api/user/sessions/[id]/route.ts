import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Delete a specific session (revoke access)
 *
 * Security:
 * - Only allows users to delete their own sessions
 * - Prevents deleting the current session (use logout instead)
 * - Logs the action for security audit
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const session = await auth()
  const requestId = getRequestId(request)

  try {
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      )
    }

    const { id: sessionId } = await params

    // Get current session token from cookie
    // Cookie name differs between dev and production (HTTPS)
    const sessionCookie =
      request.cookies.get("__Secure-next-auth.session-token") || // Production (HTTPS)
      request.cookies.get("next-auth.session-token") // Development (HTTP)
    const currentSessionToken = sessionCookie?.value

    // Fetch the session to delete
    const targetSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        sessionToken: true,
        userId: true,
        ipAddress: true,
        country: true,
        city: true,
        userAgent: true,
      },
    })

    if (!targetSession) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    // Security check: Only allow users to delete their own sessions
    if (targetSession.userId !== session.user.id) {
      await logger.warn("Attempted to delete another user's session", {
        category: "security",
        requestId,
        userId: session.user.id,
        metadata: {
          targetSessionId: sessionId,
          targetUserId: targetSession.userId,
        },
      })

      return NextResponse.json(
        { error: "Forbidden - You can only delete your own sessions" },
        { status: 403 }
      )
    }

    // Prevent deleting current session (should use logout instead)
    if (targetSession.sessionToken === currentSessionToken) {
      return NextResponse.json(
        { error: "Cannot delete current session - Use logout instead" },
        { status: 400 }
      )
    }

    // Delete the session
    await prisma.session.delete({
      where: { id: sessionId },
    })

    await logger.info("Session revoked by user", {
      category: "security",
      requestId,
      userId: session.user.id,
      metadata: {
        revokedSessionId: sessionId,
        revokedSessionIP: targetSession.ipAddress,
        revokedSessionLocation: targetSession.country && targetSession.city
          ? `${targetSession.city}, ${targetSession.country}`
          : targetSession.country || "Unknown",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Session revoked successfully",
    })
  } catch (error) {
    const { id: sessionId } = await params
    await logger.error("Failed to delete session", {
      category: "api",
      requestId,
      userId: session?.user?.id,
      metadata: {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      },
    })

    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    )
  }
}
