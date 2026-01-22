/**
 * Safe Geolocation Service with Rate Limiting
 *
 * Industry-standard approach:
 * - 1 API call per session creation
 * - Graceful degradation if API fails or rate limit hit
 * - In-memory rate limiting to protect quota
 * - 24-hour caching per IP
 *
 * Uses ip-api.com: 45 requests/minute (free tier)
 */

import { getGeoLocation } from "./geolocation"

interface RateLimitState {
  requestCount: number
  windowStart: number
  blocked: boolean
}

// In-memory rate limiter (resets on server restart)
const rateLimitState: RateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
  blocked: false,
}

// Rate limit: 40 requests per minute (leave 5 as buffer from 45 limit)
const MAX_REQUESTS_PER_MINUTE = 40
const RATE_WINDOW_MS = 60 * 1000 // 1 minute

/**
 * Get geolocation with rate limiting and graceful fallback
 *
 * This is ONLY called during session creation (login)
 * - If rate limit is hit: Returns null (graceful degradation)
 * - If API fails: Returns null (graceful degradation)
 * - If successful: Returns location data
 */
export async function getGeoLocationSafe(ip: string | null): Promise<{
  country: string | null
  city: string | null
}> {
  // Skip local/private IPs
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: "Local", city: null }
  }

  // Check rate limit
  const now = Date.now()

  // Reset window if needed
  if (now - rateLimitState.windowStart > RATE_WINDOW_MS) {
    rateLimitState.requestCount = 0
    rateLimitState.windowStart = now
    rateLimitState.blocked = false
  }

  // If we're blocked or approaching limit, return null (graceful degradation)
  if (rateLimitState.blocked || rateLimitState.requestCount >= MAX_REQUESTS_PER_MINUTE) {
    if (!rateLimitState.blocked) {
      rateLimitState.blocked = true
      console.warn(`[GeoLocation] Rate limit reached (${MAX_REQUESTS_PER_MINUTE}/min). Gracefully degrading to null location.`)
    }
    return { country: null, city: null }
  }

  // Increment request count
  rateLimitState.requestCount++

  try {
    // Make the API call (uses internal cache, so duplicate IPs are free)
    const result = await getGeoLocation(ip)

    // Log successful lookup
    if (process.env.NODE_ENV === "development") {
      console.log(`[GeoLocation] Lookup successful: ${result.country}, ${result.city} (${rateLimitState.requestCount}/${MAX_REQUESTS_PER_MINUTE} requests this minute)`)
    }

    return {
      country: result.country,
      city: result.city,
    }
  } catch (error) {
    // API call failed - graceful degradation
    console.warn(`[GeoLocation] API call failed for IP ${ip.substring(0, 8)}...:`, error instanceof Error ? error.message : String(error))
    return { country: null, city: null }
  }
}

/**
 * Get current rate limit status (for monitoring)
 */
export function getGeoLocationRateLimit() {
  const now = Date.now()
  const timeLeftInWindow = Math.max(0, RATE_WINDOW_MS - (now - rateLimitState.windowStart))

  return {
    requestCount: rateLimitState.requestCount,
    maxRequests: MAX_REQUESTS_PER_MINUTE,
    blocked: rateLimitState.blocked,
    resetInMs: timeLeftInWindow,
    resetInSeconds: Math.ceil(timeLeftInWindow / 1000),
  }
}
