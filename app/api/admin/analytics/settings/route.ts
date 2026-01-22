import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"
import { clearAnalyticsCache } from "@/lib/analytics"
import { setCsrfTokenCookie, validateCsrfToken } from "@/lib/csrf"

/**
 * GET /api/admin/analytics/settings
 * Get current analytics settings
 */
export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let settings = await prisma.analyticsSettings.findUnique({
      where: { id: "analytics_config" },
    })

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.analyticsSettings.create({
        data: { id: "analytics_config" },
      })
    }

    const response = NextResponse.json(settings)

    // Set CSRF token for subsequent mutations (reuse existing if present)
    setCsrfTokenCookie(response, request)

    return response
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Failed to fetch analytics settings", {
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
 * PUT /api/admin/analytics/settings
 * Update analytics settings
 */
export async function PUT(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const {
      trackPageViews,
      trackUserActivity,
      trackDeviceInfo,
      trackGeolocation,
      trackSubscriptionEvents,
      trackPerformance,
      samplingRate,
      batchSize,
      asyncTracking,
      retainRawData,
      retainAggregatedData,
      metabaseDashboards,
    } = body

    const settings = await prisma.analyticsSettings.upsert({
      where: { id: "analytics_config" },
      create: {
        id: "analytics_config",
        trackPageViews,
        trackUserActivity,
        trackDeviceInfo,
        trackGeolocation,
        trackSubscriptionEvents,
        trackPerformance,
        samplingRate,
        batchSize,
        asyncTracking,
        retainRawData,
        retainAggregatedData,
        metabaseDashboards: metabaseDashboards || [],
        updatedBy: session.user.id,
      },
      update: {
        trackPageViews,
        trackUserActivity,
        trackDeviceInfo,
        trackGeolocation,
        trackSubscriptionEvents,
        trackPerformance,
        samplingRate,
        batchSize,
        asyncTracking,
        retainRawData,
        retainAggregatedData,
        metabaseDashboards: metabaseDashboards || [],
        updatedBy: session.user.id,
      },
    })

    // Clear cache so new settings take effect immediately
    clearAnalyticsCache()

    await logger.info("Analytics settings updated", {
      category: "admin",
      requestId: getRequestId(request),
      userId: session.user.id,
      metadata: {
        changes: body,
      },
    })

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Failed to update analytics settings", {
      category: "admin",
      requestId,
      userId: session?.user?.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
