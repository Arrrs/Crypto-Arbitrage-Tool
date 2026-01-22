import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { executeCronJob, cleanupOldLogs, checkAlerts, cleanupExpiredEmailChanges } from "@/lib/cron"
import { clearOldGeoCache } from "@/lib/geolocation"
import { validateCsrfToken } from "@/lib/csrf"

/**
 * Manually execute a cron job
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
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
  const params = await props.params
  const { id } = params

  try {
    const job = await prisma.cronJob.findUnique({
      where: { id },
    })

    if (!job) {
      return NextResponse.json(
        { error: "Cron job not found" },
        { status: 404 }
      )
    }

    // Execute the job based on its name
    let handler: () => Promise<any>

    switch (job.name) {
      case "log_cleanup":
        handler = cleanupOldLogs
        break
      case "check_alerts":
        handler = checkAlerts
        break
      case "geo_cache_cleanup":
        handler = async () => {
          clearOldGeoCache()
          return { success: true, output: "Geo cache cleared", recordsAffected: 0 }
        }
        break
      case "email_change_cleanup":
      case "cleanup_expired_email_changes":
        handler = cleanupExpiredEmailChanges
        break
      default:
        return NextResponse.json(
          { error: "Unknown job handler" },
          { status: 400 }
        )
    }

    // Execute in background (don't await)
    executeCronJob(job.name, handler).catch(async (error) => {
      await logger.error(`Manual cron execution failed for ${job.name}`, {
        category: "admin",
        requestId,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
    })

    await logAdminAction(authResult.user.id, "EXECUTE_CRON_JOB", {
      resource: "CronJob",
      resourceId: id,
      metadata: { jobName: job.name },
      request,
      severity: "WARNING",
    })

    return NextResponse.json({
      success: true,
      message: `Job ${job.name} has been queued for execution`,
    })
  } catch (error) {
    await logger.error("Failed to execute cron job", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to execute cron job" },
      { status: 500 }
    )
  }
}
