import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { setCsrfTokenCookie, validateCsrfToken } from "@/lib/csrf"

/**
 * Get all system settings
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const requestId = getRequestId(request)

  try {
    const settings = await prisma.systemSettings.findMany({
      orderBy: { key: "asc" },
    })

    const response = NextResponse.json({ settings })

    // Set CSRF token for subsequent mutations (reuse existing if present)
    setCsrfTokenCookie(response, request)

    return response
  } catch (error) {
    await logger.error("Failed to fetch settings", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

/**
 * Update a system setting
 */
export async function PUT(request: NextRequest) {
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
    const body = await request.json()
    const { key, value, description } = body

    // Get old value for history
    const oldSetting = await prisma.systemSettings.findUnique({
      where: { key },
    })

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      create: {
        key,
        value,
        description,
        updatedBy: authResult.user.id,
      },
      update: {
        value,
        description,
        updatedBy: authResult.user.id,
      },
    })

    // Save to history if this was an update (not create)
    if (oldSetting) {
      await prisma.settingsHistory.create({
        data: {
          key,
          oldValue: oldSetting.value as any,
          newValue: value as any,
          changedBy: authResult.user.id,
        },
      })
    }

    await logAdminAction(authResult.user.id, "UPDATE_SYSTEM_SETTINGS", {
      resource: "SystemSettings",
      resourceId: setting.id,
      metadata: {
        key,
        oldValue: oldSetting?.value || null,
        newValue: value,
      },
      request,
      severity: "CRITICAL",
    })

    return NextResponse.json({ setting })
  } catch (error) {
    await logger.error("Failed to update setting", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    )
  }
}
