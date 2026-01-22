import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Update alert
 */
export async function PATCH(
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
    const body = await request.json()
    const { name, description, type, condition, enabled, cooldown, channels } = body

    const alert = await prisma.alert.update({
      where: { id },
      data: {
        name,
        description,
        type,
        condition,
        enabled,
        cooldown,
      },
      include: {
        channels: true,
      },
    })

    // Update channels if provided
    if (channels && channels.length > 0) {
      // Delete existing channels
      await prisma.alertChannel.deleteMany({
        where: { alertId: id },
      })

      // Create new channels
      await prisma.alertChannel.createMany({
        data: channels.map((channel: any) => ({
          alertId: id,
          type: channel.type,
          config: channel.config,
          enabled: channel.enabled,
        })),
      })
    }

    await logAdminAction(authResult.user.id, "UPDATE_ALERT", {
      resource: "Alert",
      resourceId: id,
      metadata: { alertName: name, enabled },
      request,
      severity: "WARNING",
    })

    return NextResponse.json({ alert })
  } catch (error) {
    await logger.error("Failed to update alert", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    )
  }
}

/**
 * Delete alert
 */
export async function DELETE(
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
  const { id} = params

  try {
    const alert = await prisma.alert.delete({
      where: { id },
    })

    await logAdminAction(authResult.user.id, "DELETE_ALERT", {
      resource: "Alert",
      resourceId: id,
      metadata: { alertName: alert.name },
      request,
      severity: "CRITICAL",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    await logger.error("Failed to delete alert", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    )
  }
}
