import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { testTelegramConfig } from "@/lib/telegram"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Test Telegram bot configuration
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
    const { botToken, chatId } = body

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Bot token and chat ID are required" },
        { status: 400 }
      )
    }

    const result = await testTelegramConfig({ botToken, chatId })

    return NextResponse.json(result)
  } catch (error) {
    await logger.error("Failed to test Telegram config", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { success: false, error: "Failed to test Telegram configuration" },
      { status: 500 }
    )
  }
}
