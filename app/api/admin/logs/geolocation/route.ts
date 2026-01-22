import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { getGeoLocation } from "@/lib/geolocation"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Lookup geolocation for specific IPs and update database
 * POST /api/admin/logs/geolocation
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
    const { ipAddress, logType } = body

    if (!ipAddress) {
      return NextResponse.json(
        { error: "IP address is required" },
        { status: 400 }
      )
    }

    // Lookup geolocation
    const geo = await getGeoLocation(ipAddress)

    // Update logs with this IP address
    const updates: any = {
      country: geo.country,
      city: geo.city,
    }

    let updatedCount = 0

    // Update session logs
    if (!logType || logType === "session") {
      const sessionResult = await prisma.sessionLog.updateMany({
        where: {
          ipAddress,
          country: null, // Only update if not already set
        },
        data: updates,
      })
      updatedCount += sessionResult.count
    }

    // Update audit logs
    if (!logType || logType === "audit") {
      const auditResult = await prisma.auditLog.updateMany({
        where: {
          ipAddress,
          country: null, // Only update if not already set
        },
        data: updates,
      })
      updatedCount += auditResult.count
    }

    return NextResponse.json({
      success: true,
      ipAddress,
      country: geo.country,
      city: geo.city,
      updatedCount,
      message: `Updated ${updatedCount} log(s) with geolocation data`,
    })
  } catch (error: any) {
    await logger.error("Geolocation lookup error", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      {
        error: "Failed to lookup geolocation",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
