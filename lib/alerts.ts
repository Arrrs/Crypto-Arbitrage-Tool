/**
 * Alert System
 * Monitors conditions and triggers notifications
 */

import { prisma } from "./prisma"
import { sendTelegramMessage, formatAlertMessage, type TelegramConfig } from "./telegram"
import { sendAlertEmail } from "./email-db"
import { logger } from "./logger"

export interface AlertCondition {
  type: "threshold" | "pattern" | "custom"
  metric?: string
  threshold?: number
  timeWindow?: number // minutes
  pattern?: string
}

/**
 * Check if an alert should be triggered
 */
export async function checkAlert(alertId: string): Promise<boolean> {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { channels: true, triggers: true },
  })

  if (!alert || !alert.enabled) {
    return false
  }

  const condition = alert.condition as any

  // Check cooldown
  const lastTrigger = alert.triggers[0]
  if (lastTrigger && !lastTrigger.resolved) {
    const secondsSince = Math.floor(
      (Date.now() - lastTrigger.triggered.getTime()) / 1000
    )
    if (secondsSince < alert.cooldown) {
      return false // Still in cooldown
    }
  }

  // Evaluate condition based on type
  let shouldTrigger = false
  let message = ""
  let metadata: any = {}

  switch (condition.type) {
    case "failed_logins":
      const result = await checkFailedLogins(condition)
      shouldTrigger = result.triggered
      message = result.message
      metadata = result.metadata
      break

    case "admin_role_change":
      // This will be triggered directly when the action occurs
      break

    case "error_spike":
      const errorResult = await checkErrorSpike(condition)
      shouldTrigger = errorResult.triggered
      message = errorResult.message
      metadata = errorResult.metadata
      break

    default:
      break
  }

  if (shouldTrigger) {
    await triggerAlert(alert.id, message, metadata)
    return true
  }

  return false
}

/**
 * Get system limits for alerts
 */
async function getSystemLimits() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { key: "system_limits" },
    })

    if (settings?.value) {
      const value = settings.value as any
      return {
        maxLoginAttempts: value.maxLoginAttempts || 5,
        loginAttemptWindowMinutes: value.loginAttemptWindowMinutes || 15,
      }
    }
  } catch (error) {
    // If we can't read settings, use defaults
  }

  return {
    maxLoginAttempts: 5,
    loginAttemptWindowMinutes: 15,
  }
}

/**
 * Check for failed login attempts
 */
async function checkFailedLogins(condition: any): Promise<{
  triggered: boolean
  message: string
  metadata: any
}> {
  // Use system settings instead of alert condition
  const limits = await getSystemLimits()
  const timeWindow = limits.loginAttemptWindowMinutes
  const threshold = limits.maxLoginAttempts

  const since = new Date(Date.now() - timeWindow * 60 * 1000)

  const failedLogins = await prisma.sessionLog.groupBy({
    by: ["ipAddress"],
    where: {
      success: false,
      timestamp: { gte: since },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gte: threshold,
        },
      },
    },
  })

  if (failedLogins.length > 0) {
    const topIP = failedLogins[0]
    return {
      triggered: true,
      message: `${topIP._count.id} failed login attempts detected from IP ${topIP.ipAddress} in the last ${timeWindow} minutes.`,
      metadata: {
        ipAddress: topIP.ipAddress,
        attemptCount: topIP._count.id,
        timeWindow,
      },
    }
  }

  return {
    triggered: false,
    message: "",
    metadata: {},
  }
}

/**
 * Check for error spike
 */
async function checkErrorSpike(condition: any): Promise<{
  triggered: boolean
  message: string
  metadata: any
}> {
  const timeWindow = condition.timeWindow || 5 // minutes
  const threshold = condition.threshold || 10

  const since = new Date(Date.now() - timeWindow * 60 * 1000)

  const errorCount = await prisma.appLog.count({
    where: {
      level: "ERROR",
      timestamp: { gte: since },
    },
  })

  if (errorCount >= threshold) {
    return {
      triggered: true,
      message: `${errorCount} errors detected in the last ${timeWindow} minutes.`,
      metadata: {
        errorCount,
        timeWindow,
        threshold,
      },
    }
  }

  return {
    triggered: false,
    message: "",
    metadata: {},
  }
}

/**
 * Trigger an alert and send notifications
 */
export async function triggerAlert(
  alertId: string,
  message: string,
  metadata: any = {}
): Promise<void> {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { channels: true },
  })

  if (!alert) return

  // Create trigger record
  const trigger = await prisma.alertTrigger.create({
    data: {
      alertId,
      message,
      metadata,
      sent: false,
      channels: alert.channels.filter((c) => c.enabled).map((c) => c.type),
    },
  })

  // Send to all enabled channels
  for (const channel of alert.channels) {
    if (!channel.enabled) continue

    try {
      if (channel.type === "TELEGRAM") {
        const config = channel.config as any
        const telegramConfig: TelegramConfig = {
          botToken: config.botToken,
          chatId: config.chatId,
        }

        const formattedMessage = formatAlertMessage({
          title: alert.name,
          severity: alert.type,
          message,
          timestamp: new Date(),
          metadata,
        })

        await sendTelegramMessage(telegramConfig, {
          text: formattedMessage,
          parseMode: "HTML",
        })

        logger.info(`Alert sent via Telegram: ${alert.name}`, {
          category: "alerts",
          metadata: { alertId, triggerId: trigger.id },
        })
      } else if (channel.type === "EMAIL") {
        const config = channel.config as any
        const recipientEmail = config.email

        if (!recipientEmail) {
          logger.warn("Email channel has no recipient configured", {
            category: "alerts",
            metadata: { alertId, channelId: channel.id },
          })
          continue
        }

        await sendAlertEmail(
          recipientEmail,
          alert.name,
          alert.type,
          message,
          metadata
        )

        logger.info(`Alert sent via Email: ${alert.name}`, {
          category: "alerts",
          metadata: { alertId, triggerId: trigger.id, email: recipientEmail },
        })
      }

      // TODO: Add WEBHOOK support here
    } catch (error) {
      logger.error(`Failed to send alert via ${channel.type}`, {
        category: "alerts",
        metadata: { alertId, channelId: channel.id, error },
      })
    }
  }

  // Mark as sent
  await prisma.alertTrigger.update({
    where: { id: trigger.id },
    data: { sent: true },
  })
}

/**
 * Trigger a specific alert by name
 */
export async function triggerAlertByName(
  name: string,
  message: string,
  metadata: any = {}
): Promise<void> {
  const alert = await prisma.alert.findFirst({
    where: { name, enabled: true },
  })

  if (alert) {
    await triggerAlert(alert.id, message, metadata)
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(triggerId: string): Promise<void> {
  await prisma.alertTrigger.update({
    where: { id: triggerId },
    data: { resolved: new Date() },
  })
}
