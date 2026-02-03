/**
 * Telegram Bot Service
 * Sends notifications via Telegram
 */

import { logger } from "./logger"

export interface TelegramConfig {
  botToken: string
  chatId: string
}

export interface TelegramMessage {
  text: string
  parseMode?: "HTML" | "Markdown" | "MarkdownV2"
  disableNotification?: boolean
}

/**
 * Send a message via Telegram
 */
export async function sendTelegramMessage(
  config: TelegramConfig,
  message: TelegramMessage
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message.text,
        parse_mode: message.parseMode || "HTML",
        disable_notification: message.disableNotification || false,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      await logger.error("Telegram API error", {
        category: "alerts",
        metadata: { error, statusCode: response.status },
      })
      return false
    }

    return true
  } catch (error) {
    await logger.error("Failed to send Telegram message", {
      category: "alerts",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return false
  }
}

/**
 * Format alert message for Telegram
 */
export function formatAlertMessage(alert: {
  title: string
  severity: string
  message: string
  timestamp: Date
  metadata?: Record<string, any>
}): string {
  const emoji =
    alert.severity === "CRITICAL" ? "🚨" :
    alert.severity === "WARNING" ? "⚠️" :
    alert.severity === "ERROR" ? "❌" :
    "ℹ️"

  let text = `${emoji} <b>${alert.title}</b>\n\n`
  text += `<b>Severity:</b> ${alert.severity}\n`
  text += `<b>Time:</b> ${alert.timestamp.toLocaleString()}\n\n`
  text += `${alert.message}\n`

  if (alert.metadata && Object.keys(alert.metadata).length > 0) {
    text += `\n<b>Details:</b>\n`
    for (const [key, value] of Object.entries(alert.metadata)) {
      text += `• ${key}: ${JSON.stringify(value)}\n`
    }
  }

  return text
}

/**
 * Test Telegram configuration
 */
export async function testTelegramConfig(config: TelegramConfig): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const success = await sendTelegramMessage(config, {
      text: "✅ Telegram bot is configured correctly!\n\nYou will receive critical alerts here.",
      parseMode: "HTML",
    })

    if (success) {
      return { success: true }
    } else {
      return { success: false, error: "Failed to send test message" }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get Telegram config from database
 */
async function getTelegramConfigFromDb(): Promise<TelegramConfig | null> {
  try {
    // Dynamic import to avoid circular dependency
    const { prisma } = await import("./prisma")

    const setting = await prisma.systemSettings.findUnique({
      where: { key: "telegram_config" },
    })

    if (!setting?.value) return null

    const config = setting.value as { botToken?: string; chatId?: string; enabled?: boolean }

    if (!config.enabled || !config.botToken || !config.chatId) {
      return null
    }

    return {
      botToken: config.botToken,
      chatId: config.chatId,
    }
  } catch {
    return null
  }
}

/**
 * Send notification about new user registration
 */
export async function notifyNewUserRegistration(user: {
  id: string
  name: string | null
  email: string
  trialExpiresAt: Date
}): Promise<void> {
  const config = await getTelegramConfigFromDb()
  if (!config) return

  const trialDays = Math.ceil(
    (user.trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  const message = `👤 <b>New User Registration</b>

<b>Name:</b> ${user.name || "Not provided"}
<b>Email:</b> ${user.email}
<b>User ID:</b> <code>${user.id}</code>

🎁 <b>Trial:</b> ${trialDays} days (expires ${user.trialExpiresAt.toLocaleDateString()})

<i>User has been granted automatic trial access.</i>`

  await sendTelegramMessage(config, {
    text: message,
    parseMode: "HTML",
  })
}

/**
 * Send notification when user's trial has expired
 */
export async function notifyTrialExpired(user: {
  id: string
  name: string | null
  email: string
}): Promise<void> {
  const config = await getTelegramConfigFromDb()
  if (!config) return

  const message = `⏰ <b>Trial Expired</b>

<b>Name:</b> ${user.name || "Not provided"}
<b>Email:</b> ${user.email}
<b>User ID:</b> <code>${user.id}</code>

<i>User tried to access premium features after trial expiry.</i>
<i>Consider extending their access if they're interested.</i>`

  await sendTelegramMessage(config, {
    text: message,
    parseMode: "HTML",
  })
}
