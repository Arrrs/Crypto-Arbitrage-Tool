import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { getGeoLocation, getClientIP } from "./geolocation"
import type { AuditSeverity } from "@prisma/client"

/**
 * Application Logger
 *
 * Comprehensive logging system that writes to database.
 * Use this instead of console.log for production-ready logging.
 *
 * Features:
 * - Request ID tracking for distributed tracing
 * - Structured JSON logging for production
 * - Database persistence with fallback to console
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"
type LogCategory = "auth" | "api" | "database" | "email" | "admin" | "security" | "system" | "alerts"

interface LogOptions {
  category?: LogCategory
  metadata?: Record<string, any>
  error?: Error
  userId?: string
  requestId?: string
}

/**
 * Structured log format for external aggregators (DataDog, CloudWatch, etc.)
 */
interface StructuredLog {
  timestamp: string
  level: LogLevel
  message: string
  category: string
  requestId?: string
  userId?: string
  metadata?: Record<string, any>
  stack?: string
  environment: string
  service: string
  version: string
}

/**
 * Helper function to extract request ID from request headers
 */
export function getRequestId(request: Request): string | undefined {
  return request.headers.get("X-Request-ID") || undefined
}

/**
 * Main logging function
 */
export async function log(
  level: LogLevel,
  message: string,
  options?: LogOptions
) {
  const { category = "system", metadata, error, userId, requestId } = options || {}

  // Build structured log object
  const structuredLog: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    category,
    requestId,
    userId,
    metadata,
    stack: error?.stack,
    environment: process.env.NODE_ENV || "development",
    service: "nextauth-app",
    version: process.env.npm_package_version || "1.0.0",
  }

  try {
    // Output structured JSON in production for log aggregators
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(structuredLog))
    } else {
      // Human-readable format for development
      const logFn = level === "ERROR" ? console.error :
                    level === "WARN" ? console.warn :
                    level === "DEBUG" ? console.debug :
                    console.log

      // For admin category, only log a summary to reduce verbosity
      // Full details are in the database (AuditLog table)
      if (category === "admin" && level === "DEBUG") {
        // Skip debug admin logs in console (they're in the database)
        // This prevents verbose output while keeping audit trail
      } else {
        logFn(
          `[${level}][${category}]${requestId ? `[${requestId.substring(0, 8)}]` : ""}`,
          message,
          metadata || ""
        )
      }
      if (error) {
        console.error(error)
      }
    }

    // Write to database with request ID in metadata
    await prisma.appLog.create({
      data: {
        level,
        message,
        category,
        metadata: {
          ...metadata,
          requestId,
          userId,
        },
        stack: error?.stack || null,
      },
    })
  } catch (err) {
    // Fallback to console if database write fails
    console.error("[Logger] Failed to write log:", err)
    console.error("[Logger] Original log:", structuredLog)
  }
}

/**
 * Convenience logging methods
 */
export const logger = {
  debug: (message: string, options?: LogOptions) =>
    log("DEBUG", message, options),

  info: (message: string, options?: LogOptions) =>
    log("INFO", message, options),

  warn: (message: string, options?: LogOptions) =>
    log("WARN", message, options),

  error: (message: string, options?: LogOptions) =>
    log("ERROR", message, options),
}

/**
 * Session Activity Logger
 * Tracks user login/logout events
 */
export async function logSessionActivity(
  userId: string,
  event: "LOGIN" | "LOGOUT" | "SESSION_REFRESH" | "PASSWORD_RESET" | "PASSWORD_CHANGE",
  options?: {
    method?: string
    success?: boolean
    failReason?: string
    request?: Request
  }
) {
  const { method, success = true, failReason, request } = options || {}

  try {
    // Get IP, user agent, and request ID
    let ipAddress: string | null = null
    let userAgent: string | null = null
    let requestId: string | undefined = undefined
    let country: string | null = null
    let city: string | null = null

    if (request) {
      ipAddress = getClientIP(request)
      userAgent = request.headers.get("user-agent") || null
      requestId = getRequestId(request)

      // Note: Geolocation is NOT fetched automatically to save API quota
      // Admin can lookup geolocation on-demand via the UI
    }

    await prisma.sessionLog.create({
      data: {
        userId,
        event,
        method,
        ipAddress,
        userAgent,
        country,
        city,
        success,
        failReason,
      },
    })

    // Log security events with request ID
    if (!success) {
      await logger.warn(`Failed ${event} attempt for user ${userId}`, {
        category: "security",
        metadata: { event, method, failReason, ipAddress },
        requestId,
        userId,
      })
    }
  } catch (error) {
    console.error("[SessionLogger] Failed to log session activity:", error)
  }
}

/**
 * Admin Audit Logger
 * Tracks all admin actions with full details
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  details: {
    resource?: string
    resourceId?: string
    metadata?: Record<string, any>
    request?: Request
    severity?: AuditSeverity
  }
) {
  const { resource, resourceId, metadata, request, severity } = details

  try {
    // Get IP and user agent
    let ipAddress: string | null = null
    let userAgent: string | null = null
    let country: string | null = null
    let city: string | null = null

    if (request) {
      ipAddress = getClientIP(request)
      userAgent = request.headers.get("user-agent") || null

      // Note: Geolocation is NOT fetched automatically to save API quota
      // Admin can lookup geolocation on-demand via the UI
    }

    // Determine severity based on action if not provided
    const actionSeverity = severity || determineSeverity(action)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        severity: actionSeverity,
        resource,
        resourceId,
        details: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        ipAddress,
        userAgent,
        country,
        city,
      },
    })

    // Also log to general app log (using debug level to reduce console verbosity)
    // Full details are already in AuditLog table, so console doesn't need all metadata
    await logger.debug(`Admin action: ${action}`, {
      category: "admin",
      metadata: {
        adminId,
        action,
        resource,
        resourceId,
        ...metadata,
      },
    })
  } catch (error) {
    console.error("[AuditLogger] Failed to log admin action:", error)
  }
}

/**
 * Determine severity level based on action type
 */
function determineSeverity(action: string): AuditSeverity {
  // CRITICAL actions
  if (
    action.includes("DELETE") ||
    action.includes("ROLE") ||
    action === "UPDATE_USER_ROLE" ||
    action === "REVOKE_ADMIN"
  ) {
    return "CRITICAL"
  }

  // WARNING actions
  if (
    action.includes("UPDATE") ||
    action.includes("SUBSCRIPTION") ||
    action.includes("VERIFY")
  ) {
    return "WARNING"
  }

  // INFO actions (default)
  return "INFO"
}

/**
 * Rate Limit Logger
 * Tracks rate limit attempts and blocks
 */
export async function logRateLimit(
  identifier: string,
  endpoint: string,
  options?: {
    userId?: string
    blocked?: boolean
    windowMinutes?: number
  }
) {
  const { userId, blocked = false, windowMinutes = 15 } = options || {}

  try {
    const now = new Date()
    const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000)

    // Check if there's an existing log entry for this window
    const existing = await prisma.rateLimitLog.findFirst({
      where: {
        identifier,
        endpoint,
        windowEnd: { gt: now },
      },
      orderBy: { timestamp: "desc" },
    })

    if (existing) {
      // Update existing entry
      await prisma.rateLimitLog.update({
        where: { id: existing.id },
        data: {
          attempts: { increment: 1 },
          blocked,
          timestamp: now,
        },
      })
    } else {
      // Create new entry
      await prisma.rateLimitLog.create({
        data: {
          identifier,
          endpoint,
          userId,
          attempts: 1,
          blocked,
          windowStart: now,
          windowEnd,
        },
      })
    }

    if (blocked) {
      await logger.warn(`Rate limit exceeded: ${endpoint}`, {
        category: "security",
        metadata: { identifier, endpoint, userId },
      })
    }
  } catch (error) {
    console.error("[RateLimitLogger] Failed to log rate limit:", error)
  }
}

/**
 * Get request metadata helper
 */
export async function getRequestMetadata(request?: Request) {
  if (!request) {
    return {
      ipAddress: "unknown",
      userAgent: "unknown",
    }
  }

  return {
    ipAddress: request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  }
}

/**
 * Clean old logs (call this periodically via cron job)
 */
export async function cleanOldLogs(daysToKeep: number = 90) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  try {
    const [appLogs, sessionLogs, rateLimitLogs] = await Promise.all([
      prisma.appLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } },
      }),
      prisma.sessionLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } },
      }),
      prisma.rateLimitLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } },
      }),
    ])

    await logger.info(`Cleaned old logs: ${appLogs.count + sessionLogs.count + rateLimitLogs.count} entries deleted`, {
      category: "system",
      metadata: { daysToKeep, cutoffDate },
    })
  } catch (error) {
    await logger.error("Failed to clean old logs", {
      category: "system",
      error: error as Error,
    })
  }
}
