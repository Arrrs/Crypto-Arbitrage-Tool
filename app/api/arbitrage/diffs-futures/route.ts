import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFuturesDiffs, checkSubscription, FuturesDiffsParams } from "@/lib/arbitrage"
import { logger, getRequestId } from "@/lib/logger"
import { z } from "zod"

// Zod schema for input validation
const futuresDiffsSchema = z.object({
  topRows: z.string().regex(/^\d+$|^all$/i).optional(),
  exchanges: z.array(z.string().max(50)).max(20).optional(),
  symbols: z.array(z.string().max(20)).max(100).optional(),
  coins: z.array(z.string().max(10)).max(50).optional(),
  opposite: z.boolean().optional(),
})

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
    let exchanges = searchParams.getAll("exchanges").filter(Boolean)
    let symbols = searchParams.getAll("symbol").filter(Boolean)
    let coins = searchParams.getAll("coins").filter(Boolean)

    // Handle comma-separated values
    if (exchanges.length === 1 && exchanges[0].includes(",")) {
      exchanges = exchanges[0].split(",").filter(Boolean)
    }
    if (symbols.length === 1 && symbols[0].includes(",")) {
      symbols = symbols[0].split(",").filter(Boolean)
    }
    if (coins.length === 1 && coins[0].includes(",")) {
      coins = coins[0].split(",").filter(Boolean)
    }

    // Validate input with Zod
    const rawParams = {
      topRows: searchParams.get("topRows") || undefined,
      exchanges: exchanges.length > 0 ? exchanges : undefined,
      symbols: symbols.length > 0 ? symbols : undefined,
      coins: coins.length > 0 ? coins : undefined,
      opposite: searchParams.get("opposite") === "true" ? true : undefined,
    }

    const validation = futuresDiffsSchema.safeParse(rawParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const params: FuturesDiffsParams = validation.data

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
