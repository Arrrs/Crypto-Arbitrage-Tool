import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logger, getRequestId } from "@/lib/logger"

/**
 * Get Session Activity Logs with pagination and search
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
    const event = searchParams.get("event")
    const success = searchParams.get("success")

    const where: any = {}

    if (search) {
      where.OR = [
        { event: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    if (event) {
      where.event = event
    }

    if (success !== null && success !== undefined && success !== "") {
      where.success = success === "true"
    }

    if (cursor) {
      where.timestamp = {
        lt: new Date(cursor),
      }
    }

    const logs = await prisma.sessionLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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
    await logger.error("Failed to fetch session logs", {
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
