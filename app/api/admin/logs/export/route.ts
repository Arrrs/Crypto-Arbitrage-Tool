import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Export logs as CSV or JSON
 */
export async function POST(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const requestId = getRequestId(request)

  try {
    const body = await request.json()
    const { logType, format, startDate, endDate, filters } = body

    // Build where clause
    const where: any = {}
    if (startDate) {
      where.timestamp = { gte: new Date(startDate) }
    }
    if (endDate) {
      where.timestamp = { ...where.timestamp, lte: new Date(endDate) }
    }

    let data: any[] = []

    // Fetch data based on log type
    switch (logType) {
      case "audit":
        data = await prisma.auditLog.findMany({
          where,
          include: {
            admin: {
              select: { name: true, email: true },
            },
          },
          orderBy: { timestamp: "desc" },
          take: 10000, // Limit to 10k records
        })
        break

      case "session":
        data = await prisma.sessionLog.findMany({
          where,
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
          orderBy: { timestamp: "desc" },
          take: 10000,
        })
        break

      case "app":
        data = await prisma.appLog.findMany({
          where,
          orderBy: { timestamp: "desc" },
          take: 10000,
        })
        break

      default:
        return NextResponse.json(
          { error: "Invalid log type" },
          { status: 400 }
        )
    }

    // Format data
    if (format === "json") {
      return NextResponse.json(data, {
        headers: {
          "Content-Disposition": `attachment; filename="${logType}_logs_${Date.now()}.json"`,
          "Content-Type": "application/json",
        },
      })
    } else if (format === "csv") {
      const csv = convertToCSV(data)
      return new NextResponse(csv, {
        headers: {
          "Content-Disposition": `attachment; filename="${logType}_logs_${Date.now()}.csv"`,
          "Content-Type": "text/csv",
        },
      })
    }

    return NextResponse.json(
      { error: "Invalid format" },
      { status: 400 }
    )
  } catch (error) {
    await logger.error("Failed to export logs", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to export logs" },
      { status: 500 }
    )
  }
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ""

  // Get headers from first object
  const headers = Object.keys(data[0]).filter(
    (key) => typeof data[0][key] !== "object" || data[0][key] === null
  )

  // Create CSV header row
  let csv = headers.join(",") + "\n"

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      if (value === null || value === undefined) return ""
      if (typeof value === "string" && value.includes(",")) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return String(value)
    })
    csv += values.join(",") + "\n"
  }

  return csv
}
