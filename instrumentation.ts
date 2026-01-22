/**
 * Next.js Instrumentation
 *
 * This file is automatically called by Next.js when the server starts.
 * Use it to initialize services that should run for the lifetime of the server.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate environment variables on startup
    try {
      await import("./lib/env")
      if (process.env.NODE_ENV === "development") {
        console.log("[Instrumentation] ✅ Environment variables validated")
      }
    } catch (error) {
      console.error("[Instrumentation] ❌ Environment validation failed")
      // Let the error propagate to stop server startup
      throw error
    }

    // Only run on Node.js runtime (not Edge runtime)
    const { initializeCronJobs } = await import("./lib/cron-scheduler")

    if (process.env.NODE_ENV === "development") {
      console.log("[Instrumentation] Initializing application services...")
    }

    try {
      // Initialize cron jobs
      await initializeCronJobs()

      if (process.env.NODE_ENV === "development") {
        console.log("[Instrumentation] Application services initialized successfully")
      }
    } catch (error) {
      console.error("[Instrumentation] Failed to initialize cron jobs:", error)
      // Don't crash the app if cron initialization fails
      // Jobs can be managed manually via admin UI
    }
  }
}
