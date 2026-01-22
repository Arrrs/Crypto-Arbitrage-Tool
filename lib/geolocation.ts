/**
 * IP Geolocation Service
 * Uses ip-api.com (free, no API key required for non-commercial use)
 * Limit: 45 requests per minute
 */

import { logger } from "./logger"

interface GeoLocation {
  country: string | null
  city: string | null
  region?: string
  lat?: number
  lon?: number
}

// Cache for IP lookups (prevent duplicate API calls)
const geoCache = new Map<string, { data: GeoLocation; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get geolocation data for an IP address
 */
export async function getGeoLocation(ip: string | null): Promise<GeoLocation> {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    // Local/private IPs
    return { country: "Local", city: null }
  }

  // Check cache
  const cached = geoCache.get(ip)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Use ip-api.com free service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,regionName,lat,lon`, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      throw new Error(`Geolocation API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === "success") {
      const geoData: GeoLocation = {
        country: data.country || null,
        city: data.city || null,
        region: data.regionName || undefined,
        lat: data.lat || undefined,
        lon: data.lon || undefined,
      }

      // Cache the result
      geoCache.set(ip, { data: geoData, timestamp: Date.now() })

      return geoData
    }

    // Failed lookup
    return { country: null, city: null }
  } catch (error) {
    await logger.warn(`Geolocation lookup failed for IP`, {
      category: "system",
      metadata: {
        ip: ip?.substring(0, 8) + "...", // Partial IP for privacy
        error: error instanceof Error ? error.message : String(error)
      },
    })
    // Return null values on error, don't block the main operation
    return { country: null, city: null }
  }
}

/**
 * Extract IP from Next.js request
 */
export function getClientIP(request: Request): string | null {
  // Check various headers
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }

  // Fallback (will be ::1 or 127.0.0.1 in local dev)
  return null
}

/**
 * Clear old cache entries (call this periodically)
 */
export function clearOldGeoCache() {
  const now = Date.now()
  for (const [ip, entry] of geoCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      geoCache.delete(ip)
    }
  }
}
