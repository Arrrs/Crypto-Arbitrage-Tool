import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Health Check Endpoint
 *
 * Used for:
 * - Load balancer health checks
 * - Uptime monitoring (UptimeRobot, Pingdom, etc.)
 * - Container orchestration (Docker, K8s)
 * - CI/CD deployment verification
 *
 * Returns:
 * - 200 OK: All systems operational
 * - 503 Service Unavailable: Database connection failed
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    const responseTime = Date.now() - startTime
    const uptime = process.uptime()

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        database: "connected",
        responseTime: `${responseTime}ms`,
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
      { status: 200 }
    )
  } catch (error) {
    // Database connection failed
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    )
  }
}

/**
 * HEAD method for minimal health checks
 * Returns only status code (200 or 503)
 */
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
