import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken, setCsrfTokenCookie } from "@/lib/csrf"

/**
 * Get all alerts
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
    const alerts = await prisma.alert.findMany({
      include: {
        channels: true,
        triggers: {
          take: 10,
          orderBy: { triggered: "desc" },
        },
        _count: {
          select: { triggers: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const response = NextResponse.json({ alerts })
    setCsrfTokenCookie(response, request)
    return response
  } catch (error) {
    await logger.error("Failed to fetch alerts", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    )
  }
}

/**
 * Create new alert
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
    const body = await request.json()
    const { name, description, type, condition, enabled, cooldown, channels } = body

    const alert = await prisma.alert.create({
      data: {
        name,
        description,
        type,
        condition,
        enabled,
        cooldown,
        channels: {
          create: channels || [],
        },
      },
      include: {
        channels: true,
      },
    })

    await logAdminAction(authResult.user.id, "CREATE_ALERT", {
      resource: "Alert",
      resourceId: alert.id,
      metadata: { alertName: name, type },
      request,
      severity: "WARNING",
    })

    return NextResponse.json({ alert })
  } catch (error) {
    await logger.error("Failed to create alert", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    )
  }
}
