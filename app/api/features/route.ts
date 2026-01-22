import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logger, getRequestId } from "@/lib/logger"

/**
 * Premium Analytics API Endpoint
 *
 * Security: This endpoint checks subscription status on the SERVER
 * to prevent client-side bypasses. Only active subscribers can access.
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  const requestId = getRequestId(request)

  try {
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      )
    }

    // Fetch user with subscription info from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isPaid: true,
        paidUntil: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // SERVER-SIDE subscription check
    const now = new Date()
    const hasActiveSubscription =
      user.isPaid &&
      user.paidUntil &&
      new Date(user.paidUntil) > now

    if (!hasActiveSubscription) {
      return NextResponse.json(
        {
          error: "Premium subscription required",
          message: "This feature requires an active premium subscription",
          subscriptionStatus: "inactive"
        },
        { status: 403 } // Forbidden
      )
    }

    // If we reach here, user has valid subscription
    // Calculate days until subscription expires
    const subscriptionExpiresInDays = user.paidUntil
      ? Math.ceil((new Date(user.paidUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Return premium analytics data
    const analyticsData = {
      subscriptionStatus: "active",
      subscriptionExpiresInDays,
      data: {
        users: {
          total: 1234,
          growth: 12,
          activeToday: 892,
          activeWeek: 3456,
          newSignups: 234,
        },
        revenue: {
          total: 45678.00,
          growth: 23,
          subscription: 32450,
          oneTime: 8920,
          addons: 4308,
        },
        growth: {
          rate: 28.5,
          trend: 5,
        },
        conversions: {
          total: 567,
          growth: 8,
        },
      },
      message: "Analytics data retrieved successfully"
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Analytics API error", {
      category: "api",
      requestId,
      userId: session?.user?.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
