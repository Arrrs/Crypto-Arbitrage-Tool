import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logger, getRequestId } from "@/lib/logger"
import { setCsrfTokenCookie } from "@/lib/csrf"

export async function GET(request: NextRequest) {
  // Secure admin authorization with database validation
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  try {
    // Pagination parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100) // Max 100
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || ""

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ]
    }

    if (role && (role === "USER" || role === "ADMIN" || role === "PREMIUM")) {
      where.role = role
    }

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          emailVerified: true,
          adminVerified: true,
          isPaid: true,
          paidUntil: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    const response = NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total,
      },
    })

    setCsrfTokenCookie(response, request)
    return response
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Failed to fetch users list", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
