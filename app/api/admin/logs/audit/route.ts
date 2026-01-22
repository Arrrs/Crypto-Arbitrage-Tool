import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logger, getRequestId } from "@/lib/logger"
import { setCsrfTokenCookie } from "@/lib/csrf"

/**
 * Get Admin Audit Logs with pagination and search
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
    const cursor = searchParams.get("cursor") // Timestamp cursor for pagination
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") // Search term
    const action = searchParams.get("action") // Filter by action

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { resource: { contains: search, mode: "insensitive" } },
        { admin: { email: { contains: search, mode: "insensitive" } } },
      ]
    }

    if (action) {
      where.action = action
    }

    // Add cursor condition for pagination
    if (cursor) {
      where.timestamp = {
        lt: new Date(cursor),
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit + 1, // Fetch one extra to check if there are more
    })

    const hasMore = logs.length > limit
    const results = hasMore ? logs.slice(0, limit) : logs
    const nextCursor = hasMore ? results[results.length - 1].timestamp.toISOString() : null

    const response = NextResponse.json({
      logs: results,
      hasMore,
      nextCursor,
    })

    setCsrfTokenCookie(response, request)
    return response
  } catch (error) {
    await logger.error("Failed to fetch audit logs", {
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
