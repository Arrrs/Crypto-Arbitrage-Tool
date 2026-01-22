/**
 * Analytics Tracking System
 *
 * Performance-optimized, optional analytics with:
 * - Async/non-blocking tracking
 * - Sampling support
 * - Toggle controls
 * - Device/browser detection
 * - Automatic aggregation
 */

import { prisma } from "./prisma"
import { logger } from "./logger"

// Cache for settings (reduce DB queries)
let settingsCache: {
  data: any
  timestamp: number
} | null = null
const CACHE_TTL = 60000 // 1 minute

/**
 * Get analytics settings (cached)
 */
async function getAnalyticsSettings() {
  const now = Date.now()

  // Return cached settings if still valid
  if (settingsCache && (now - settingsCache.timestamp) < CACHE_TTL) {
    return settingsCache.data
  }

  try {
    let settings = await prisma.analyticsSettings.findUnique({
      where: { id: "analytics_config" },
    })

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.analyticsSettings.create({
        data: { id: "analytics_config" },
      })
    }

    settingsCache = { data: settings, timestamp: now }
    return settings
  } catch (error) {
    // Fallback to safe defaults if DB error
    return {
      trackPageViews: true,
      trackUserActivity: true,
      trackDeviceInfo: true,
      trackGeolocation: true,
      trackSubscriptionEvents: true,
      trackPerformance: false,
      samplingRate: 100,
      asyncTracking: true,
    }
  }
}

/**
 * Check if we should track (based on sampling rate)
 */
function shouldTrack(samplingRate: number): boolean {
  if (samplingRate >= 100) return true
  return Math.random() * 100 < samplingRate
}

/**
 * Parse User-Agent to extract device info
 */
export function parseUserAgent(userAgent: string | null): {
  deviceType: string | null
  browser: string | null
  browserVersion: string | null
  os: string | null
  osVersion: string | null
} {
  if (!userAgent) {
    return {
      deviceType: null,
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
    }
  }

  const ua = userAgent.toLowerCase()

  // Device Type
  let deviceType: string | null = "desktop"
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = "tablet"
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    deviceType = "mobile"
  }

  // Browser
  let browser: string | null = null
  let browserVersion: string | null = null

  // Check for Brave first (though Brave intentionally hides its identity for privacy)
  // Brave can sometimes be detected via navigator.brave, but not from user agent alone
  if (ua.includes("brave")) {
    browser = "Brave"
    browserVersion = userAgent.match(/Brave\/([\d.]+)/)?.[1] || null
  } else if (ua.includes("edg/") || ua.includes("edge/")) {
    // Edge (Chromium-based) uses "Edg/" or "Edge/"
    browser = "Edge"
    browserVersion = userAgent.match(/(?:Edg|Edge)\/([\d.]+)/)?.[1] || null
  } else if (ua.includes("chrome")) {
    // Chrome and Chromium-based browsers (including Brave if not detected above)
    browser = "Chrome"
    browserVersion = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || null
  } else if (ua.includes("firefox")) {
    browser = "Firefox"
    browserVersion = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || null
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari"
    browserVersion = userAgent.match(/Version\/([\d.]+)/)?.[1] || null
  } else if (ua.includes("opera") || ua.includes("opr/")) {
    browser = "Opera"
    browserVersion = userAgent.match(/(?:Opera|OPR)\/([\d.]+)/)?.[1] || null
  }

  // OS
  let os: string | null = null
  let osVersion: string | null = null

  if (ua.includes("windows nt")) {
    os = "Windows"
    const version = userAgent.match(/Windows NT ([\d.]+)/)?.[1]
    const versionMap: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    }
    osVersion = version ? (versionMap[version] || version) : null
  } else if (ua.includes("mac os x")) {
    os = "macOS"
    osVersion = userAgent.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".") || null
  } else if (ua.includes("android")) {
    os = "Android"
    osVersion = userAgent.match(/Android ([\d.]+)/)?.[1] || null
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS"
    osVersion = userAgent.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || null
  } else if (ua.includes("linux")) {
    os = "Linux"
  }

  return { deviceType, browser, browserVersion, os, osVersion }
}

/**
 * Track user activity (async, non-blocking)
 */
export async function trackActivity(params: {
  userId: string
  activity: string
  resource?: string
  action?: string
  metadata?: Record<string, any>
  duration?: number
  userAgent?: string | null
  ipAddress?: string | null
  country?: string | null
  city?: string | null
}): Promise<void> {
  // Get settings
  const settings = await getAnalyticsSettings()

  // Check if tracking is enabled
  if (!settings.trackUserActivity) return

  // Check if this activity should be tracked (sampling)
  if (!shouldTrack(settings.samplingRate)) return

  // Prepare tracking function
  const track = async () => {
    try {
      // Parse device info if enabled
      let deviceInfo: any = {}
      if (settings.trackDeviceInfo && params.userAgent) {
        deviceInfo = parseUserAgent(params.userAgent)
      }

      // Prepare geolocation if enabled
      let geoInfo: any = {}
      if (settings.trackGeolocation) {
        geoInfo = {
          ipAddress: params.ipAddress,
          country: params.country,
          city: params.city,
        }
      }

      // Insert activity log
      await prisma.userActivityLog.create({
        data: {
          userId: params.userId,
          activity: params.activity,
          resource: params.resource,
          action: params.action,
          metadata: params.metadata,
          duration: params.duration,
          userAgent: settings.trackDeviceInfo ? params.userAgent : null,
          ...deviceInfo,
          ...geoInfo,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      // Silent fail - don't break user experience
      await logger.warn("Analytics tracking failed", {
        category: "system",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  // Track asynchronously if enabled, otherwise block
  if (settings.asyncTracking) {
    // Fire and forget
    track().catch(() => {}) // Silently fail
  } else {
    await track()
  }
}

/**
 * Track subscription change
 */
export async function trackSubscriptionChange(params: {
  userId: string
  changeType: string
  fromStatus?: string
  toStatus: string
  fromPlan?: string
  toPlan?: string
  amount?: number
  currency?: string
  paymentMethod?: string
  transactionId?: string
  reason?: string
  metadata?: Record<string, any>
}): Promise<void> {
  const settings = await getAnalyticsSettings()

  if (!settings.trackSubscriptionEvents) return

  const track = async () => {
    try {
      await prisma.subscriptionChangeLog.create({
        data: {
          userId: params.userId,
          changeType: params.changeType,
          fromStatus: params.fromStatus,
          toStatus: params.toStatus,
          fromPlan: params.fromPlan,
          toPlan: params.toPlan,
          amount: params.amount,
          currency: params.currency,
          paymentMethod: params.paymentMethod,
          transactionId: params.transactionId,
          reason: params.reason,
          metadata: params.metadata,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      await logger.warn("Subscription tracking failed", {
        category: "system",
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  if (settings.asyncTracking) {
    track().catch(() => {})
  } else {
    await track()
  }
}

/**
 * Track page view (simplified helper)
 */
export async function trackPageView(params: {
  userId: string
  path: string
  userAgent?: string | null
  ipAddress?: string | null
  country?: string | null
  city?: string | null
}): Promise<void> {
  const settings = await getAnalyticsSettings()

  if (!settings.trackPageViews) return

  await trackActivity({
    userId: params.userId,
    activity: "PAGE_VIEW",
    resource: params.path,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    country: params.country,
    city: params.city,
  })
}

/**
 * Track feature usage
 */
export async function trackFeatureUse(params: {
  userId: string
  featureName: string
  action?: string
  metadata?: Record<string, any>
}): Promise<void> {
  await trackActivity({
    userId: params.userId,
    activity: "FEATURE_USE",
    resource: params.featureName,
    action: params.action,
    metadata: params.metadata,
  })
}

/**
 * Clear settings cache (call when settings are updated)
 */
export function clearAnalyticsCache() {
  settingsCache = null
}
