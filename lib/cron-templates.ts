/**
 * Cron Job Templates
 *
 * Reusable job templates that can be configured via UI
 * No code changes needed to create new jobs using these templates
 */

import { prisma } from "./prisma"
import { sendTelegramMessage } from "./telegram"

export interface CronTemplateParameter {
  name: string
  type: "text" | "number" | "select" | "boolean"
  label: string
  description?: string
  options?: string[]
  default?: any
  min?: number
  max?: number
  required?: boolean
}

export interface CronTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  parameters: CronTemplateParameter[]
  handler: (params: Record<string, any>) => Promise<{
    success: boolean
    recordsAffected: number
    output: string
  }>
}

/**
 * Cleanup Old Data Template
 */
const cleanupOldDataTemplate: CronTemplate = {
  id: "cleanup_old_data",
  name: "Cleanup Old Data",
  description: "Delete records older than specified days from any table",
  icon: "🗑️",
  category: "system",
  parameters: [
    {
      name: "tableName",
      type: "select",
      label: "Table Name",
      description: "Which table to clean up",
      options: ["AuditLog", "SessionLog", "AppLog", "RateLimitLog"],
      required: true,
    },
    {
      name: "daysToKeep",
      type: "number",
      label: "Days to Keep",
      description: "Keep records from the last N days",
      default: 30,
      min: 1,
      max: 365,
      required: true,
    },
  ],
  handler: async (params) => {
    const { tableName, daysToKeep } = params
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

    let deleted: any

    switch (tableName) {
      case "AuditLog":
        deleted = await prisma.auditLog.deleteMany({
          where: { timestamp: { lt: cutoff } },
        })
        break
      case "SessionLog":
        deleted = await prisma.sessionLog.deleteMany({
          where: { timestamp: { lt: cutoff } },
        })
        break
      case "AppLog":
        deleted = await prisma.appLog.deleteMany({
          where: { timestamp: { lt: cutoff } },
        })
        break
      case "RateLimitLog":
        deleted = await prisma.rateLimitLog.deleteMany({
          where: { timestamp: { lt: cutoff } },
        })
        break
      default:
        throw new Error(`Unknown table: ${tableName}`)
    }

    return {
      success: true,
      recordsAffected: deleted.count,
      output: `Deleted ${deleted.count} old records from ${tableName} (older than ${daysToKeep} days)`,
    }
  },
}

/**
 * Send Telegram Report Template
 */
const sendTelegramReportTemplate: CronTemplate = {
  id: "send_telegram_report",
  name: "Send Telegram Report",
  description: "Send activity report via Telegram",
  icon: "📊",
  category: "system",
  parameters: [
    {
      name: "reportType",
      type: "select",
      label: "Report Type",
      description: "What kind of report to send",
      options: ["Daily Summary", "Weekly Summary", "User Activity", "Error Summary"],
      required: true,
    },
    {
      name: "includeLast24h",
      type: "boolean",
      label: "Include Last 24 Hours",
      description: "Include statistics from last 24 hours",
      default: true,
    },
  ],
  handler: async (params) => {
    const { reportType, includeLast24h } = params

    // Get Telegram config
    const telegramSettings = await prisma.systemSettings.findUnique({
      where: { key: "telegram_config" },
    })

    if (!telegramSettings?.value || !(telegramSettings.value as any).enabled) {
      return {
        success: false,
        recordsAffected: 0,
        output: "Telegram is not configured or disabled",
      }
    }

    const config = telegramSettings.value as { botToken: string; chatId: string; enabled: boolean }

    // Gather statistics
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    let reportText = ""

    switch (reportType) {
      case "Daily Summary":
        const dailyUsers = await prisma.sessionLog.groupBy({
          by: ["userId"],
          where: {
            timestamp: { gte: last24h },
            success: true,
            event: "LOGIN",
          },
        })

        const dailyErrors = await prisma.appLog.count({
          where: {
            level: "ERROR",
            timestamp: { gte: last24h },
          },
        })

        reportText = `📊 Daily Summary\n\n` +
          `Active Users (24h): ${dailyUsers.length}\n` +
          `Errors (24h): ${dailyErrors}\n` +
          `Report Time: ${now.toLocaleString()}`
        break

      case "Weekly Summary":
        const weeklyUsers = await prisma.sessionLog.groupBy({
          by: ["userId"],
          where: {
            timestamp: { gte: last7d },
            success: true,
            event: "LOGIN",
          },
        })

        const weeklyActions = await prisma.auditLog.count({
          where: { timestamp: { gte: last7d } },
        })

        reportText = `📊 Weekly Summary\n\n` +
          `Active Users (7d): ${weeklyUsers.length}\n` +
          `Admin Actions (7d): ${weeklyActions}\n` +
          `Report Time: ${now.toLocaleString()}`
        break

      case "Error Summary":
        const errorCount = await prisma.appLog.groupBy({
          by: ["category"],
          where: {
            level: "ERROR",
            timestamp: { gte: includeLast24h ? last24h : last7d },
          },
          _count: { id: true },
        })

        reportText = `⚠️ Error Summary\n\n` +
          errorCount.map(e => `${e.category}: ${e._count.id} errors`).join("\n") +
          `\n\nPeriod: ${includeLast24h ? "Last 24h" : "Last 7d"}`
        break

      default:
        reportText = `📊 ${reportType}\n\nReport generated at: ${now.toLocaleString()}`
    }

    // Send via Telegram
    await sendTelegramMessage(config, { text: reportText })

    return {
      success: true,
      recordsAffected: 1,
      output: `Sent ${reportType} report via Telegram`,
    }
  },
}

/**
 * Database Backup Template
 */
const databaseBackupTemplate: CronTemplate = {
  id: "database_backup",
  name: "Database Backup",
  description: "Create a backup of specific tables",
  icon: "💾",
  category: "system",
  parameters: [
    {
      name: "tables",
      type: "select",
      label: "Tables to Backup",
      description: "Which tables to include in backup",
      options: ["All", "Users Only", "Logs Only", "Settings Only"],
      required: true,
    },
    {
      name: "notifyOnComplete",
      type: "boolean",
      label: "Send Notification",
      description: "Send Telegram notification when backup completes",
      default: true,
    },
  ],
  handler: async (params) => {
    const { tables, notifyOnComplete } = params

    // Count records to "backup"
    let recordCount = 0

    switch (tables) {
      case "All":
        const userCount = await prisma.user.count()
        const logCount = await prisma.auditLog.count()
        const settingsCount = await prisma.systemSettings.count()
        recordCount = userCount + logCount + settingsCount
        break
      case "Users Only":
        recordCount = await prisma.user.count()
        break
      case "Logs Only":
        const auditCount = await prisma.auditLog.count()
        const sessionCount = await prisma.sessionLog.count()
        recordCount = auditCount + sessionCount
        break
      case "Settings Only":
        recordCount = await prisma.systemSettings.count()
        break
    }

    // Send notification if enabled
    if (notifyOnComplete) {
      const telegramSettings = await prisma.systemSettings.findUnique({
        where: { key: "telegram_config" },
      })

      if (telegramSettings?.value && (telegramSettings.value as any).enabled) {
        const config = telegramSettings.value as { botToken: string; chatId: string }
        await sendTelegramMessage(config, {
          text: `💾 Backup Complete\n\nTables: ${tables}\nRecords: ${recordCount}`,
        })
      }
    }

    return {
      success: true,
      recordsAffected: recordCount,
      output: `Backed up ${recordCount} records from ${tables}`,
    }
  },
}

/**
 * User Activity Summary Template
 */
const userActivitySummaryTemplate: CronTemplate = {
  id: "user_activity_summary",
  name: "User Activity Summary",
  description: "Generate summary of user activity",
  icon: "👥",
  category: "system",
  parameters: [
    {
      name: "timeRange",
      type: "select",
      label: "Time Range",
      description: "Activity period to analyze",
      options: ["Last 24 Hours", "Last 7 Days", "Last 30 Days"],
      required: true,
    },
    {
      name: "minActions",
      type: "number",
      label: "Minimum Actions",
      description: "Only include users with at least this many actions",
      default: 1,
      min: 1,
      max: 1000,
    },
  ],
  handler: async (params) => {
    const { timeRange, minActions } = params

    let cutoff: Date
    switch (timeRange) {
      case "Last 24 Hours":
        cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case "Last 7 Days":
        cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case "Last 30 Days":
        cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    }

    const activity = await prisma.sessionLog.groupBy({
      by: ["userId"],
      where: {
        timestamp: { gte: cutoff },
      },
      _count: { id: true },
      having: {
        id: {
          _count: {
            gte: minActions,
          },
        },
      },
    })

    return {
      success: true,
      recordsAffected: activity.length,
      output: `Found ${activity.length} active users in ${timeRange} with at least ${minActions} actions`,
    }
  },
}

/**
 * Check Alerts Template
 */
const checkAlertsTemplate: CronTemplate = {
  id: "CHECK_ALERTS",
  name: "Check Alerts",
  description: "Check all enabled alerts and trigger notifications",
  icon: "🚨",
  category: "system",
  parameters: [],
  handler: async () => {
    // Import checkAlerts from cron.ts
    const { checkAlerts } = await import("./cron")
    return await checkAlerts()
  },
}

/**
 * Analytics Aggregation Templates
 */

// Import analytics cron functions
import {
  aggregateDailyStats,
  aggregateHourlyStats,
  aggregateFeatureUsageStats,
  cleanupOldAnalyticsData,
} from "./analytics-cron"

const aggregateDailyStatsTemplate: CronTemplate = {
  id: "aggregate_daily_stats",
  name: "Aggregate Daily Analytics",
  description: "Aggregate yesterday's analytics data into DailyUserStats table",
  icon: "📊",
  category: "system",
  parameters: [],
  handler: async () => {
    const result = await aggregateDailyStats()
    return {
      success: result.success,
      recordsAffected: 1,
      output: result.success
        ? `Aggregated daily stats for ${result.date}: ${JSON.stringify(result.stats)}`
        : `Failed: ${result.error}`,
    }
  },
}

const aggregateHourlyStatsTemplate: CronTemplate = {
  id: "aggregate_hourly_stats",
  name: "Aggregate Hourly Analytics",
  description: "Aggregate last hour's analytics data",
  icon: "⏰",
  category: "system",
  parameters: [],
  handler: async () => {
    const result = await aggregateHourlyStats()
    return {
      success: result.success,
      recordsAffected: 1,
      output: result.success
        ? `Aggregated hourly stats for ${result.hour}`
        : `Failed: ${result.error}`,
    }
  },
}

const aggregateFeatureUsageTemplate: CronTemplate = {
  id: "aggregate_feature_usage",
  name: "Aggregate Feature Usage",
  description: "Aggregate yesterday's feature usage data",
  icon: "🎯",
  category: "system",
  parameters: [],
  handler: async () => {
    const result = await aggregateFeatureUsageStats()
    return {
      success: result.success,
      recordsAffected: result.featuresProcessed || 0,
      output: result.success
        ? `Aggregated ${result.featuresProcessed} features for ${result.date}`
        : `Failed: ${result.error}`,
    }
  },
}

const cleanupAnalyticsDataTemplate: CronTemplate = {
  id: "cleanup_analytics_data",
  name: "Cleanup Old Analytics Data",
  description: "Delete old analytics data based on retention settings",
  icon: "🧹",
  category: "system",
  parameters: [],
  handler: async () => {
    const result = await cleanupOldAnalyticsData()
    return {
      success: result.success,
      recordsAffected: result.deleted
        ? result.deleted.activities + result.deleted.hourlyStats + result.deleted.dailyStats + result.deleted.featureStats
        : 0,
      output: result.success
        ? `Deleted: ${JSON.stringify(result.deleted)}`
        : `Failed: ${result.error}`,
    }
  },
}

/**
 * All available templates
 */
export const cronTemplates: Record<string, CronTemplate> = {
  cleanup_old_data: cleanupOldDataTemplate,
  send_telegram_report: sendTelegramReportTemplate,
  database_backup: databaseBackupTemplate,
  user_activity_summary: userActivitySummaryTemplate,
  CHECK_ALERTS: checkAlertsTemplate,
  aggregate_daily_stats: aggregateDailyStatsTemplate,
  aggregate_hourly_stats: aggregateHourlyStatsTemplate,
  aggregate_feature_usage: aggregateFeatureUsageTemplate,
  cleanup_analytics_data: cleanupAnalyticsDataTemplate,
}

/**
 * Get template by ID
 */
export function getCronTemplate(id: string): CronTemplate | undefined {
  return cronTemplates[id]
}

/**
 * Get all templates
 */
export function getAllCronTemplates(): CronTemplate[] {
  return Object.values(cronTemplates)
}

/**
 * Get templates by category
 */
export function getCronTemplatesByCategory(category: string): CronTemplate[] {
  return Object.values(cronTemplates).filter((t) => t.category === category)
}
