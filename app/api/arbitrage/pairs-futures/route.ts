import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFuturesPairsFilterData, checkSubscription } from "@/lib/arbitrage"
import { logger, getRequestId } from "@/lib/logger"

/**
 * GET /api/arbitrage/pairs-futures
 * Get unique exchanges, symbols and coins for futures pairs filter dropdowns
 * Requires authentication and active subscription
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  const requestId = getRequestId(request)

  try {
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check subscription
    const { hasSubscription } = await checkSubscription(session.user.id)
    if (!hasSubscription) {
      return NextResponse.json(
        { error: "Premium subscription required" },
        { status: 403 }
      )
    }

    const data = await getFuturesPairsFilterData()
    return NextResponse.json(data)
  } catch (error) {
    await logger.error("Arbitrage pairs-futures API error", {
      category: "api",
      requestId,
      userId: session?.user?.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
