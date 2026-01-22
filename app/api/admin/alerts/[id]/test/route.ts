import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { triggerAlert } from "@/lib/alerts"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Test an alert by sending a test notification
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const requestId = getRequestId(request)
  const params = await props.params
  const { id } = params

  try {
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: { channels: true },
    })

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    // Send test notification
    await triggerAlert(
      id,
      `This is a test notification for alert: ${alert.name}`,
      {
        test: true,
        triggeredBy: authResult.user.email,
        timestamp: new Date().toISOString(),
      }
    )

    return NextResponse.json({
      success: true,
      message: "Test notification sent successfully",
    })
  } catch (error) {
    await logger.error("Failed to test alert", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    )
  }
}
