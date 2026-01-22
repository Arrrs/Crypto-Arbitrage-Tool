/**
 * Analytics Data Aggregation & Cleanup Cron Jobs
 *
 * These functions:
 * 1. Aggregate raw data into summary tables (space-efficient)
 * 2. Clean up old raw data based on retention settings
 * 3. Maintain historical trends without storing all raw data
 */

import { prisma } from "./prisma"
import { logger } from "./logger"

/**
 * Aggregate yesterday's data into DailyUserStats
 * Run daily at 1 AM
 */
export async function aggregateDailyStats() {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const tomorrow = new Date(yesterday)
    tomorrow.setDate(tomorrow.getDate() + 1)

    await logger.info("Starting daily analytics aggregation", {
      category: "system",
      metadata: { date: yesterday.toISOString() },
    })

    // Count total users
    const totalUsers = await prisma.user.count()

    // Count new users for that day
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: tomorrow,
        },
      },
    })

    // Count active users (logged in that day)
    const activeUsers = await prisma.sessionLog.groupBy({
      by: ["userId"],
      where: {
        timestamp: {
          gte: yesterday,
          lt: tomorrow,
        },
        event: "LOGIN",
        success: true,
      },
    })

    // Count paid vs free users
    const paidUsers = await prisma.user.count({
      where: {
        isPaid: true,
        paidUntil: { gte: yesterday },
      },
    })

    const freeUsers = totalUsers - paidUsers

    // Count logins
    const loginStats = await prisma.sessionLog.groupBy({
      by: ["success"],
      where: {
        timestamp: { gte: yesterday, lt: tomorrow },
        event: "LOGIN",
      },
      _count: true,
    })

    const totalLogins = loginStats.find(s => s.success)?._count || 0
    const failedLogins = loginStats.find(s => !s.success)?._count || 0

    // Count page views
    const totalPageViews = await prisma.userActivityLog.count({
      where: {
        timestamp: { gte: yesterday, lt: tomorrow },
        activity: "PAGE_VIEW",
      },
    })

    // Count by device type
    const deviceStats = await prisma.userActivityLog.groupBy({
      by: ["deviceType"],
      where: {
        timestamp: { gte: yesterday, lt: tomorrow },
        deviceType: { not: null },
      },
      _count: true,
    })

    const mobileUsers = deviceStats.find(d => d.deviceType === "mobile")?._count || 0
    const desktopUsers = deviceStats.find(d => d.deviceType === "desktop")?._count || 0
    const tabletUsers = deviceStats.find(d => d.deviceType === "tablet")?._count || 0

    // Top countries
    const countryStats = await prisma.userActivityLog.groupBy({
      by: ["country"],
      where: {
        timestamp: { gte: yesterday, lt: tomorrow },
        country: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          country: "desc",
        },
      },
      take: 5,
    })

    const topCountries = countryStats.map(c => ({
      country: c.country,
      count: c._count,
    }))

    // Subscription stats
    const subscriptionStats = await prisma.subscriptionChangeLog.groupBy({
      by: ["changeType"],
      where: {
        timestamp: { gte: yesterday, lt: tomorrow },
      },
      _count: true,
      _sum: {
        amount: true,
      },
    })

    const newSubscriptions = subscriptionStats
      .filter(s => s.changeType === "UPGRADE" || s.changeType === "TRIAL_START")
      .reduce((sum, s) => sum + (s._count || 0), 0)

    const cancelledSubscriptions = subscriptionStats
      .filter(s => s.changeType === "CANCEL")
      .reduce((sum, s) => sum + (s._count || 0), 0)

    const revenue = subscriptionStats
      .filter(s => s.changeType === "UPGRADE" || s.changeType === "RENEW")
      .reduce((sum, s) => sum + Number(s._sum.amount || 0), 0)

    // Upsert daily stats
    await prisma.dailyUserStats.upsert({
      where: {
        date: yesterday,
      },
      create: {
        date: yesterday,
        totalUsers,
        newUsers,
        activeUsers: activeUsers.length,
        paidUsers,
        freeUsers,
        totalLogins,
        failedLogins,
        totalPageViews,
        mobileUsers,
        desktopUsers,
        tabletUsers,
        topCountries,
        revenue,
        newSubscriptions,
        cancelledSubscriptions,
      },
      update: {
        totalUsers,
        newUsers,
        activeUsers: activeUsers.length,
        paidUsers,
        freeUsers,
        totalLogins,
        failedLogins,
        totalPageViews,
        mobileUsers,
        desktopUsers,
        tabletUsers,
        topCountries,
        revenue,
        newSubscriptions,
        cancelledSubscriptions,
      },
    })

    await logger.info("Daily analytics aggregation completed", {
      category: "system",
      metadata: {
        date: yesterday.toISOString(),
        totalUsers,
        newUsers,
        activeUsers: activeUsers.length,
      },
    })

    return { success: true, date: yesterday, stats: { totalUsers, newUsers, activeUsers: activeUsers.length } }
  } catch (error) {
    await logger.error("Daily analytics aggregation failed", {
      category: "system",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return { success: false, error }
  }
}

/**
 * Aggregate hourly stats (last hour)
 * Run hourly at :05 past the hour
 */
export async function aggregateHourlyStats() {
  try {
    const lastHour = new Date()
    lastHour.setMinutes(0, 0, 0)
    lastHour.setHours(lastHour.getHours() - 1)

    const thisHour = new Date(lastHour)
    thisHour.setHours(thisHour.getHours() + 1)

    // Page views
    const pageViews = await prisma.userActivityLog.count({
      where: {
        timestamp: { gte: lastHour, lt: thisHour },
        activity: "PAGE_VIEW",
      },
    })

    // Unique visitors
    const uniqueVisitors = await prisma.userActivityLog.groupBy({
      by: ["userId"],
      where: {
        timestamp: { gte: lastHour, lt: thisHour },
      },
    })

    // Logins
    const logins = await prisma.sessionLog.count({
      where: {
        timestamp: { gte: lastHour, lt: thisHour },
        event: "LOGIN",
        success: true,
      },
    })

    // Errors
    const errors = await prisma.appLog.count({
      where: {
        timestamp: { gte: lastHour, lt: thisHour },
        level: "ERROR",
      },
    })

    // API calls (estimate from activity logs)
    const apiCalls = await prisma.userActivityLog.count({
      where: {
        timestamp: { gte: lastHour, lt: thisHour },
      },
    })

    // Calculate error rate
    const totalRequests = apiCalls || 1
    const errorRate = (errors / totalRequests) * 100

    // Upsert hourly stats
    await prisma.hourlyActivityStats.upsert({
      where: {
        hour: lastHour,
      },
      create: {
        hour: lastHour,
        pageViews,
        uniqueVisitors: uniqueVisitors.length,
        logins,
        errors,
        apiCalls,
        errorRate,
      },
      update: {
        pageViews,
        uniqueVisitors: uniqueVisitors.length,
        logins,
        errors,
        apiCalls,
        errorRate,
      },
    })

    return { success: true, hour: lastHour }
  } catch (error) {
    await logger.error("Hourly analytics aggregation failed", {
      category: "system",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return { success: false, error }
  }
}

/**
 * Aggregate feature usage stats (yesterday)
 * Run daily at 2 AM
 */
export async function aggregateFeatureUsageStats() {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const tomorrow = new Date(yesterday)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get all feature usage for yesterday
    const featureUsage = await prisma.userActivityLog.groupBy({
      by: ["resource"],
      where: {
        timestamp: { gte: yesterday, lt: tomorrow },
        activity: "FEATURE_USE",
        resource: { not: null },
      },
      _count: true,
    })

    for (const feature of featureUsage) {
      if (!feature.resource) continue

      // Count unique users
      const uniqueUsers = await prisma.userActivityLog.groupBy({
        by: ["userId"],
        where: {
          timestamp: { gte: yesterday, lt: tomorrow },
          activity: "FEATURE_USE",
          resource: feature.resource,
        },
      })

      // Count by user type (free vs paid)
      const userActivities = await prisma.userActivityLog.findMany({
        where: {
          timestamp: { gte: yesterday, lt: tomorrow },
          activity: "FEATURE_USE",
          resource: feature.resource,
        },
        select: {
          userId: true,
        },
      })

      const userIds = [...new Set(userActivities.map(a => a.userId))]
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, isPaid: true, paidUntil: true },
      })

      const paidUserIds = users
        .filter(u => u.isPaid && u.paidUntil && u.paidUntil >= yesterday)
        .map(u => u.id)

      const paidUserUses = userActivities.filter(a => paidUserIds.includes(a.userId)).length
      const freeUserUses = userActivities.length - paidUserUses

      // Upsert feature stats
      await prisma.featureUsageStats.upsert({
        where: {
          date_featureName: {
            date: yesterday,
            featureName: feature.resource,
          },
        },
        create: {
          date: yesterday,
          featureName: feature.resource,
          totalUses: feature._count,
          uniqueUsers: uniqueUsers.length,
          freeUserUses,
          paidUserUses,
        },
        update: {
          totalUses: feature._count,
          uniqueUsers: uniqueUsers.length,
          freeUserUses,
          paidUserUses,
        },
      })
    }

    await logger.info("Feature usage aggregation completed", {
      category: "system",
      metadata: { date: yesterday.toISOString(), features: featureUsage.length },
    })

    return { success: true, date: yesterday, featuresProcessed: featureUsage.length }
  } catch (error) {
    await logger.error("Feature usage aggregation failed", {
      category: "system",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return { success: false, error }
  }
}

/**
 * Clean up old raw analytics data
 * Run daily at 3 AM
 */
export async function cleanupOldAnalyticsData() {
  try {
    const settings = await prisma.analyticsSettings.findUnique({
      where: { id: "analytics_config" },
    })

    if (!settings) {
      return { success: true, message: "Analytics settings not found, skipping cleanup" }
    }

    const retainDays = settings.retainRawData
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retainDays)

    await logger.info("Starting analytics data cleanup", {
      category: "system",
      metadata: { retainDays, cutoffDate: cutoffDate.toISOString() },
    })

    // Delete old activity logs
    const deletedActivities = await prisma.userActivityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    })

    // Delete old hourly stats (keep only recent)
    const hourlyRetentionDays = 30 // Keep hourly stats for 30 days
    const hourlyCutoff = new Date()
    hourlyCutoff.setDate(hourlyCutoff.getDate() - hourlyRetentionDays)

    const deletedHourlyStats = await prisma.hourlyActivityStats.deleteMany({
      where: {
        hour: {
          lt: hourlyCutoff,
        },
      },
    })

    // Delete old aggregated stats based on settings
    const aggregatedCutoff = new Date()
    aggregatedCutoff.setDate(aggregatedCutoff.getDate() - settings.retainAggregatedData)

    const deletedDailyStats = await prisma.dailyUserStats.deleteMany({
      where: {
        date: {
          lt: aggregatedCutoff,
        },
      },
    })

    const deletedFeatureStats = await prisma.featureUsageStats.deleteMany({
      where: {
        date: {
          lt: aggregatedCutoff,
        },
      },
    })

    await logger.info("Analytics data cleanup completed", {
      category: "system",
      metadata: {
        deletedActivities: deletedActivities.count,
        deletedHourlyStats: deletedHourlyStats.count,
        deletedDailyStats: deletedDailyStats.count,
        deletedFeatureStats: deletedFeatureStats.count,
      },
    })

    return {
      success: true,
      deleted: {
        activities: deletedActivities.count,
        hourlyStats: deletedHourlyStats.count,
        dailyStats: deletedDailyStats.count,
        featureStats: deletedFeatureStats.count,
      },
    }
  } catch (error) {
    await logger.error("Analytics data cleanup failed", {
      category: "system",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return { success: false, error }
  }
}
