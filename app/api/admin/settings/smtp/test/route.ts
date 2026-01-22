import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { testSMTPConnection } from "@/lib/email-db"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Test SMTP connection
 */
export async function POST(request: NextRequest) {
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

  try {
    const result = await testSMTPConnection()

    await logAdminAction(authResult.user.id, "TEST_SMTP_CONNECTION", {
      resource: "SystemSettings",
      resourceId: "smtp_config",
      metadata: {
        success: result.success,
        message: result.message,
      },
      request,
      severity: result.success ? "INFO" : "WARNING",
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.error,
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    await logger.error("Failed to test SMTP connection", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      {
        success: false,
        message: "Failed to test SMTP connection",
        error: error.message,
      },
      { status: 500 }
    )
  }
}
