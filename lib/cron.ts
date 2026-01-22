/**
 * Cron Job Management System
 * Handles scheduled tasks with logging and monitoring
 */

import { prisma } from "./prisma"
import { logger } from "./logger"

/**
 * Execute a cron job and log the results
 */
export async function executeCronJob(
  jobName: string,
  handler: () => Promise<{ success: boolean; output?: string; recordsAffected?: number }>
): Promise<void> {
  const job = await prisma.cronJob.findUnique({
    where: { name: jobName },
  })

  if (!job || !job.enabled) {
    return // Job is disabled or doesn't exist
  }

  const startTime = Date.now()

  // Create execution record
  const execution = await prisma.cronExecution.create({
    data: {
      jobId: job.id,
      status: "RUNNING",
      startedAt: new Date(),
    },
  })

  try {
    // Execute the job
    const result = await handler()

    const duration = Date.now() - startTime

    // Update execution record
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        status: result.success ? "SUCCESS" : "FAILURE",
        completedAt: new Date(),
        duration,
        output: result.output,
        recordsAffected: result.recordsAffected,
      },
    })

    // Update job's last run time
    await prisma.cronJob.update({
      where: { id: job.id },
      data: {
        lastRun: new Date(),
      },
    })

    if (result.success) {
      await logger.info(`Cron job completed: ${jobName}`, {
        category: "system",
        metadata: {
          duration,
          recordsAffected: result.recordsAffected,
        },
      })
    } else {
      await logger.error(`Cron job failed: ${jobName}`, {
        category: "system",
        metadata: { output: result.output },
      })
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    // Update execution with error
    await prisma.cronExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILURE",
        completedAt: new Date(),
        duration,
        error: error.message,
      },
    })

    await logger.error(`Cron job error: ${jobName}`, {
      category: "system",
      error,
    })
  }
}

/**
 * Log Cleanup Job
 * Deletes old logs based on retention policy
 */
export async function cleanupOldLogs(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    const now = new Date()

    // Get retention settings from system settings
    const settings = await prisma.systemSettings.findUnique({
      where: { key: "log_retention" },
    })

    const retention = (settings?.value as any) || {
      auditLogs: 90,
      sessionLogs: 30,
      appLogs: 30,
      rateLimitLogs: 7,
    }

    let totalDeleted = 0

    // Delete old audit logs
    const auditCutoff = new Date(now.getTime() - retention.auditLogs * 24 * 60 * 60 * 1000)
    const auditDeleted = await prisma.auditLog.deleteMany({
      where: { timestamp: { lt: auditCutoff } },
    })
    totalDeleted += auditDeleted.count

    // Delete old session logs
    const sessionCutoff = new Date(now.getTime() - retention.sessionLogs * 24 * 60 * 60 * 1000)
    const sessionDeleted = await prisma.sessionLog.deleteMany({
      where: { timestamp: { lt: sessionCutoff } },
    })
    totalDeleted += sessionDeleted.count

    // Delete old app logs (keep ERROR longer)
    const appCutoff = new Date(now.getTime() - retention.appLogs * 24 * 60 * 60 * 1000)
    const appDeleted = await prisma.appLog.deleteMany({
      where: {
        timestamp: { lt: appCutoff },
        level: { not: "ERROR" },
      },
    })
    totalDeleted += appDeleted.count

    // Delete old rate limit logs
    const rateCutoff = new Date(now.getTime() - retention.rateLimitLogs * 24 * 60 * 60 * 1000)
    const rateDeleted = await prisma.rateLimitLog.deleteMany({
      where: { timestamp: { lt: rateCutoff } },
    })
    totalDeleted += rateDeleted.count

    return {
      success: true,
      recordsAffected: totalDeleted,
      output: `Deleted ${totalDeleted} old log entries (Audit: ${auditDeleted.count}, Session: ${sessionDeleted.count}, App: ${appDeleted.count}, RateLimit: ${rateDeleted.count})`,
    }
  } catch (error: any) {
    return {
      success: false,
      recordsAffected: 0,
      output: error.message,
    }
  }
}

/**
 * Check Alerts Job
 * Evaluates alert conditions and triggers notifications
 */
export async function checkAlerts(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    const alerts = await prisma.alert.findMany({
      where: { enabled: true },
    })

    let triggeredCount = 0

    for (const alert of alerts) {
      // Import and use the alert checking logic
      const { checkAlert } = await import("./alerts")
      const triggered = await checkAlert(alert.id)
      if (triggered) {
        triggeredCount++
      }
    }

    return {
      success: true,
      recordsAffected: triggeredCount,
      output: `Checked ${alerts.length} alerts, triggered ${triggeredCount}`,
    }
  } catch (error: any) {
    return {
      success: false,
      recordsAffected: 0,
      output: error.message,
    }
  }
}

/**
 * Cleanup Expired Pending Email Changes Job
 * Removes expired, cancelled, or finalized pending email changes
 */
export async function cleanupExpiredEmailChanges(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    const now = new Date()
    let totalDeleted = 0

    // Delete expired pending email changes older than 30 days
    // Keep unexpired ones that just passed expiresAt for 30 days for audit purposes
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const expiredDeleted = await prisma.pendingEmailChange.deleteMany({
      where: {
        expiresAt: { lt: thirtyDaysAgo },
        finalized: false,
        cancelled: false,
      },
    })
    totalDeleted += expiredDeleted.count

    // Delete cancelled pending email changes older than 90 days (audit trail retention)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const cancelledDeleted = await prisma.pendingEmailChange.deleteMany({
      where: {
        cancelled: true,
        cancelledAt: { lt: ninetyDaysAgo },
      },
    })
    totalDeleted += cancelledDeleted.count

    // Delete finalized (successful) email changes older than 90 days (audit trail retention)
    const finalizedDeleted = await prisma.pendingEmailChange.deleteMany({
      where: {
        finalized: true,
        finalizedAt: { lt: ninetyDaysAgo },
      },
    })
    totalDeleted += finalizedDeleted.count

    return {
      success: true,
      recordsAffected: totalDeleted,
      output: `Deleted ${totalDeleted} pending email changes (Expired: ${expiredDeleted.count}, Cancelled: ${cancelledDeleted.count}, Finalized: ${finalizedDeleted.count})`,
    }
  } catch (error: any) {
    return {
      success: false,
      recordsAffected: 0,
      output: error.message,
    }
  }
}

/**
 * System Health Check Job
 * Monitors system health and triggers alerts
 */
export async function checkSystemHealth(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    const checks = []

    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.push({ name: "Database", status: "OK" })
    } catch (error) {
      checks.push({ name: "Database", status: "FAILED" })
    }

    // Check error rate in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const errorCount = await prisma.appLog.count({
      where: {
        level: "ERROR",
        timestamp: { gte: oneHourAgo },
      },
    })

    if (errorCount > 100) {
      checks.push({ name: "Error Rate", status: "HIGH", count: errorCount })
    } else {
      checks.push({ name: "Error Rate", status: "OK", count: errorCount })
    }

    // Check memory usage
    const used = process.memoryUsage()
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024)
    checks.push({ name: "Memory", status: "OK", usedMB: heapUsedMB })

    const failedChecks = checks.filter((c) => c.status !== "OK")
    const output = failedChecks.length > 0
      ? `Health check: ${failedChecks.length} issues - ${JSON.stringify(failedChecks)}`
      : `Health check passed - ${checks.length} checks OK`

    return {
      success: failedChecks.length === 0,
      recordsAffected: checks.length,
      output,
    }
  } catch (error: any) {
    return {
      success: false,
      recordsAffected: 0,
      output: error.message,
    }
  }
}

/**
 * Analytics Refresh Job
 * Pre-calculates analytics data for dashboard performance
 */
export async function refreshAnalytics(): Promise<{
  success: boolean
  recordsAffected: number
  output: string
}> {
  try {
    // This is a placeholder - you can implement actual analytics caching
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Count active users
    const activeUsers = await prisma.sessionLog.groupBy({
      by: ["userId"],
      where: {
        event: "LOGIN",
        success: true,
        timestamp: { gte: last24h },
      },
    })

    // Count failed logins
    const failedLogins = await prisma.sessionLog.count({
      where: {
        success: false,
        event: "LOGIN",
        timestamp: { gte: last24h },
      },
    })

    return {
      success: true,
      recordsAffected: activeUsers.length + failedLogins,
      output: `Refreshed analytics: ${activeUsers.length} active users, ${failedLogins} failed logins`,
    }
  } catch (error: any) {
    return {
      success: false,
      recordsAffected: 0,
      output: error.message,
    }
  }
}

/**
 * Initialize default cron jobs
 */
export async function initializeCronJobs() {
  const jobs = [
    {
      name: "log_cleanup",
      description: "Clean up old log entries based on retention policy",
      schedule: "0 2 * * *", // Daily at 2 AM
      enabled: true,
    },
    {
      name: "system_health_check",
      description: "Monitor system health and trigger alerts",
      schedule: "*/15 * * * *", // Every 15 minutes
      enabled: true,
    },
    {
      name: "analytics_refresh",
      description: "Pre-calculate analytics data for dashboard",
      schedule: "0 */6 * * *", // Every 6 hours
      enabled: true,
    },
  ]

  for (const job of jobs) {
    await prisma.cronJob.upsert({
      where: { name: job.name },
      create: job,
      update: {},
    })
  }
}
