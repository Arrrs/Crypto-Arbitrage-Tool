import cron, { ScheduledTask } from "node-cron"
import { prisma } from "@/lib/prisma"
import { cleanupOldLogs, checkSystemHealth, refreshAnalytics, cleanupExpiredEmailChanges, executeCronJob } from "./cron"
import { getCronTemplate } from "./cron-templates"
import { logger } from "./logger"

/**
 * Self-hosted Cron Scheduler
 *
 * This module sets up and manages all cron jobs using node-cron.
 * Jobs run in-process with your Next.js application.
 *
 * IMPORTANT: Only initialize this once when your app starts!
 */

interface CronTask {
  name: string
  schedule: string
  task: ScheduledTask | null
}

const activeTasks: Map<string, CronTask> = new Map()

/**
 * Initialize all enabled cron jobs from database
 */
export async function initializeCronJobs() {
  try {
    // Fetch all enabled cron jobs from database
    const jobs = await prisma.cronJob.findMany({
      where: { enabled: true },
    })

    for (const job of jobs) {
      await scheduleCronJob(job.name, job.schedule)
    }

    await logger.info("Cron jobs initialized", {
      category: "system",
      metadata: { count: activeTasks.size },
    })
  } catch (error) {
    await logger.error("Failed to initialize cron jobs", {
      category: "system",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
  }
}

/**
 * Schedule or reschedule a cron job
 */
export async function scheduleCronJob(jobName: string, schedule: string) {
  // Stop existing task if running
  stopCronJob(jobName)

  // Validate cron expression
  if (!cron.validate(schedule)) {
    await logger.error("Invalid cron expression", {
      category: "system",
      metadata: { jobName, schedule },
    })
    return
  }

  // Get the handler function for this job
  const handler = await getJobHandler(jobName)
  if (!handler) {
    await logger.warn("No handler found for cron job", {
      category: "system",
      metadata: { jobName },
    })
    return
  }

  // Schedule the task
  const task = cron.schedule(schedule, async () => {
    try {
      await handler()
    } catch (error) {
      await logger.error("Cron job execution failed", {
        category: "system",
        metadata: {
          jobName,
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  })

  activeTasks.set(jobName, {
    name: jobName,
    schedule,
    task,
  })

  await logger.info("Cron job scheduled", {
    category: "system",
    metadata: { jobName, schedule },
  })
}

/**
 * Stop a running cron job
 */
export function stopCronJob(jobName: string) {
  const cronTask = activeTasks.get(jobName)
  if (cronTask?.task) {
    cronTask.task.stop()
    activeTasks.delete(jobName)
    // Only log in development (this is a synchronous function)
    if (process.env.NODE_ENV === "development") {
      console.log(`[Cron Scheduler] Stopped job: ${jobName}`)
    }
  }
}

/**
 * Stop all cron jobs (useful for graceful shutdown)
 */
export function stopAllCronJobs() {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Cron Scheduler] Stopping ${activeTasks.size} cron jobs...`)
  }
  for (const [name, cronTask] of activeTasks.entries()) {
    cronTask.task?.stop()
  }
  activeTasks.clear()
  if (process.env.NODE_ENV === "development") {
    console.log("[Cron Scheduler] All cron jobs stopped")
  }
}

/**
 * Get the handler function for a specific job name
 * Supports both custom handlers and template-based jobs
 */
async function getJobHandler(jobName: string): Promise<(() => Promise<void>) | null> {
  // Check if it's a custom coded job
  const customHandlers: Record<string, () => Promise<void>> = {
    log_cleanup: async () => {
      const result = await cleanupOldLogs()
      await logger.info("Log cleanup completed", {
        category: "system",
        metadata: { output: result.output },
      })
    },

    system_health_check: async () => {
      const result = await checkSystemHealth()
      await logger.info("System health check completed", {
        category: "system",
        metadata: { output: result.output },
      })
    },

    analytics_refresh: async () => {
      const result = await refreshAnalytics()
      await logger.info("Analytics refresh completed", {
        category: "system",
        metadata: { output: result.output },
      })
    },

    cleanup_expired_email_changes: async () => {
      const result = await cleanupExpiredEmailChanges()
      await logger.info("Cleanup expired email changes completed", {
        category: "system",
        metadata: { output: result.output },
      })
    },
  }

  if (customHandlers[jobName]) {
    return customHandlers[jobName]
  }

  // Check if it's a template-based job
  const job = await prisma.cronJob.findUnique({
    where: { name: jobName },
  })

  if (job?.template) {
    const template = getCronTemplate(job.template)
    if (template) {
      return async () => {
        await executeCronJob(jobName, async () => {
          const result = await template.handler((job.parameters as Record<string, any>) || {})
          return result
        })
      }
    }
  }

  return null
}

/**
 * Get status of all active cron jobs
 */
export function getCronJobsStatus() {
  return Array.from(activeTasks.values()).map((task) => ({
    name: task.name,
    schedule: task.schedule,
    isRunning: task.task !== null,
  }))
}
