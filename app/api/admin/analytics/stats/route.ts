import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"

/**
 * GET /api/admin/analytics/stats
 * Get basic analytics stats for admin dashboard
 */
export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Execute all queries in parallel for optimal performance
    const [
      totalUsers,
      paidUsers,
      activeToday,
      activeWeek,
      activeMonth,
      recentActivityCount,
      failedLogins,
      errorCount,
      criticalAlerts,
      auditLogCount,
      sessionLogCount,
      appLogCount,
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { isPaid: true } }),

      // Active users (grouped by userId to get unique count)
      prisma.userActivityLog.groupBy({
        by: ["userId"],
        where: { timestamp: { gte: todayStart } },
      }),
      prisma.userActivityLog.groupBy({
        by: ["userId"],
        where: { timestamp: { gte: last7d } },
      }),
      prisma.userActivityLog.groupBy({
        by: ["userId"],
        where: { timestamp: { gte: last30d } },
      }),

      // Activity count
      prisma.userActivityLog.count({
        where: { timestamp: { gte: todayStart } },
      }),

      // Failed logins
      prisma.sessionLog.count({
        where: {
          success: false,
          event: "LOGIN",
          timestamp: { gte: last24h },
        },
      }),

      // Error count
      prisma.appLog.count({
        where: {
          level: "ERROR",
          timestamp: { gte: last24h },
        },
      }),

      // Critical alerts
      prisma.alertTrigger.count({
        where: {
          triggered: { gte: last24h },
          resolved: null,
          alert: {
            type: { in: ["SECURITY", "ERROR"] },
          },
        },
      }),

      // System health metrics (parallel log counts)
      prisma.auditLog.count(),
      prisma.sessionLog.count(),
      prisma.appLog.count(),
    ])

    // Calculate derived values
    const unpaidUsers = totalUsers - paidUsers
    const totalLogs = auditLogCount + sessionLogCount + appLogCount

    return NextResponse.json({
      users: {
        total: totalUsers,
        paid: paidUsers,
        unpaid: unpaidUsers,
        paidPercentage: totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0,
      },
      activeUsers: {
        today: activeToday.length,
        week: activeWeek.length,
        month: activeMonth.length,
      },
      activity: {
        eventsToday: recentActivityCount,
      },
      errors: {
        last24h: errorCount,
      },
      failedLogins,
      criticalAlerts,
      system: {
        totalLogs,
      },
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Failed to fetch analytics stats", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to fetch analytics stats" },
      { status: 500 }
    )
  }
}
