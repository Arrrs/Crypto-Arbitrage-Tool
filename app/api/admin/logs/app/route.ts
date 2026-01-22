import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logger, getRequestId } from "@/lib/logger"

/**
 * Get Application Logs with pagination and search
 */
export async function GET(request: NextRequest) {
  // Secure admin authorization
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const requestId = getRequestId(request)

  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search")
    const level = searchParams.get("level")
    const category = searchParams.get("category")

    const where: any = {}

    if (search) {
      where.OR = [
        { message: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ]
    }

    if (level) {
      where.level = level
    }

    if (category) {
      where.category = category
    }

    if (cursor) {
      where.timestamp = {
        lt: new Date(cursor),
      }
    }

    const logs = await prisma.appLog.findMany({
      where,
      orderBy: {
        timestamp: "desc",
      },
      take: limit + 1,
    })

    const hasMore = logs.length > limit
    const results = hasMore ? logs.slice(0, limit) : logs
    const nextCursor = hasMore ? results[results.length - 1].timestamp.toISOString() : null

    return NextResponse.json({
      logs: results,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    await logger.error("Failed to fetch app logs", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}
