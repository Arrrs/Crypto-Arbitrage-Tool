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
