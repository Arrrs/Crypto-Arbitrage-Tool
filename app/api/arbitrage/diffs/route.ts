import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSpotDiffs, checkSubscription, SpotDiffsParams } from "@/lib/arbitrage"
import { logger, getRequestId } from "@/lib/logger"

/**
 * GET /api/arbitrage/diffs
 * Get spot market diffs with filtering
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const params: SpotDiffsParams = {
      topRows: searchParams.get("topRows") || undefined,
      exchanges: searchParams.getAll("exchanges").filter(Boolean),
      minDiffPerc: searchParams.get("minDiffPerc") || undefined,
      maxDiffPerc: searchParams.get("maxDiffPerc") || undefined,
      symbols: searchParams.getAll("symbol").filter(Boolean),
      minLifeTime: searchParams.get("minLifeTime") || undefined,
      maxLifeTime: searchParams.get("maxLifeTime") || undefined,
    }

    // Handle comma-separated exchanges (from query string like ?exchanges=Binance,Bybit)
    if (params.exchanges?.length === 1 && params.exchanges[0].includes(",")) {
      params.exchanges = params.exchanges[0].split(",").filter(Boolean)
    }

    const data = await getSpotDiffs(params)
    return NextResponse.json(data)
  } catch (error) {
    await logger.error("Arbitrage diffs API error", {
      category: "api",
      requestId,
      userId: session?.user?.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
