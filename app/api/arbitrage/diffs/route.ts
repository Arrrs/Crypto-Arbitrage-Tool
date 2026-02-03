import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSpotDiffs, checkSubscription, SpotDiffsParams } from "@/lib/arbitrage"
import { logger, getRequestId } from "@/lib/logger"
import { z } from "zod"

// Zod schema for input validation
const spotDiffsSchema = z.object({
  topRows: z.string().regex(/^\d+$|^all$/i).optional(),
  exchanges: z.array(z.string().max(50)).max(20).optional(),
  minDiffPerc: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  maxDiffPerc: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  symbols: z.array(z.string().max(20)).max(100).optional(),
  minLifeTime: z.string().max(20).optional(),
  maxLifeTime: z.string().max(20).optional(),
})

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
    let exchanges = searchParams.getAll("exchanges").filter(Boolean)
    let symbols = searchParams.getAll("symbol").filter(Boolean)

    // Handle comma-separated values
    if (exchanges.length === 1 && exchanges[0].includes(",")) {
      exchanges = exchanges[0].split(",").filter(Boolean)
    }
    if (symbols.length === 1 && symbols[0].includes(",")) {
      symbols = symbols[0].split(",").filter(Boolean)
    }

    // Validate input with Zod
    const rawParams = {
      topRows: searchParams.get("topRows") || undefined,
      exchanges: exchanges.length > 0 ? exchanges : undefined,
      minDiffPerc: searchParams.get("minDiffPerc") || undefined,
      maxDiffPerc: searchParams.get("maxDiffPerc") || undefined,
      symbols: symbols.length > 0 ? symbols : undefined,
      minLifeTime: searchParams.get("minLifeTime") || undefined,
      maxLifeTime: searchParams.get("maxLifeTime") || undefined,
    }

    const validation = spotDiffsSchema.safeParse(rawParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const params: SpotDiffsParams = validation.data

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
