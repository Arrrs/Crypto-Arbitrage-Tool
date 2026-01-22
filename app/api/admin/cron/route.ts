import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { scheduleCronJob, stopCronJob } from "@/lib/cron-scheduler"
import { validateCsrfToken, setCsrfTokenCookie } from "@/lib/csrf"

/**
 * Get all cron jobs
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const requestId = getRequestId(request)

  try {
    const jobs = await prisma.cronJob.findMany({
      include: {
        executions: {
          take: 10,
          orderBy: { startedAt: "desc" },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { name: "asc" },
    })

    const response = NextResponse.json({ jobs })
    setCsrfTokenCookie(response, request)
    return response
  } catch (error) {
    await logger.error("Failed to fetch cron jobs", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to fetch cron jobs" },
      { status: 500 }
    )
  }
}

/**
 * Update cron job
 */
export async function PATCH(request: NextRequest) {
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
    const { id, enabled, schedule, description } = body

    const job = await prisma.cronJob.update({
      where: { id },
      data: {
        enabled,
        schedule,
        description,
      },
    })

    // Update the actual cron scheduler
    if (enabled) {
      await scheduleCronJob(job.name, schedule || job.schedule)
    } else {
      stopCronJob(job.name)
    }

    await logAdminAction(authResult.user.id, "UPDATE_CRON_JOB", {
      resource: "CronJob",
      resourceId: id,
      metadata: { jobName: job.name, enabled, schedule },
      request,
      severity: "WARNING",
    })

    return NextResponse.json({ job })
  } catch (error) {
    await logger.error("Failed to update cron job", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to update cron job" },
      { status: 500 }
    )
  }
}
