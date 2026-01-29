import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFuturesDiffs, checkSubscription, FuturesDiffsParams } from "@/lib/arbitrage"
import { logger, getRequestId } from "@/lib/logger"

/**
 * GET /api/arbitrage/diffs-futures
 * Get futures market diffs with filtering
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
    const params: FuturesDiffsParams = {
      topRows: searchParams.get("topRows") || undefined,
      exchanges: searchParams.getAll("exchanges").filter(Boolean),
      symbols: searchParams.getAll("symbol").filter(Boolean),
      coins: searchParams.getAll("coins").filter(Boolean),
      opposite: searchParams.get("opposite") === "true",
    }

    // Handle comma-separated values
    if (params.exchanges?.length === 1 && params.exchanges[0].includes(",")) {
      params.exchanges = params.exchanges[0].split(",").filter(Boolean)
    }
    if (params.coins?.length === 1 && params.coins[0].includes(",")) {
      params.coins = params.coins[0].split(",").filter(Boolean)
    }

    const data = await getFuturesDiffs(params)
    return NextResponse.json(data)
  } catch (error) {
    await logger.error("Arbitrage diffs-futures API error", {
      category: "api",
      requestId,
      userId: session?.user?.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
