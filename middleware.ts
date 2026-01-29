import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Combined Security & Auth Middleware
 *
 * 1. Generates and propagates request IDs for tracing
 * 2. Global rate limiting (DDoS protection)
 * 3. Adds security headers to all responses
 * 4. Basic auth checks (cookie presence)
 * 5. Handles authentication redirects
 * 6. Protects admin routes
 *
 * Note: We can't validate sessions in Edge Runtime middleware due to:
 * - No Prisma/database access in Edge
 * - Fetch loops if calling /api/auth/session
 *
 * Real session validation happens:
 * - Client-side: SessionProvider checks every 60s
 * - Server-side: API routes and page components use auth()
 * - On navigation: Pages call auth() to verify session
 *
 * For revoked sessions:
 * - Detected on next page navigation (server component calls auth())
 * - Detected by SessionProvider periodic check (60s in dev)
 * - Middleware only does basic cookie check for UX (prevents flashing)
 *
 * Rate Limiting:
 * - Global: 60 requests/minute per IP (hardcoded, change line 122 if needed)
 * - Exemptions: Static assets (_next/static, images, uploads)
 * - Edge Runtime compatible using in-memory cache
 */

// In-memory rate limit store for Edge Runtime (resets on deployment)
// This is a simple sliding window implementation without database dependency
interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 10 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove timestamps older than 1 hour
      entry.timestamps = entry.timestamps.filter(t => t > oneHourAgo)

      // Remove entry if no recent timestamps
      if (entry.timestamps.length === 0) {
        rateLimitStore.delete(key)
      }
    }
  }, 10 * 60 * 1000) // Every 10 minutes
}

/**
 * Check rate limit using in-memory store (Edge Runtime compatible)
 */
function checkRateLimit(
  identifier: string,
  maxAttempts: number = 60,
  windowMinutes: number = 1
): { limited: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  const windowMs = windowMinutes * 60 * 1000
  const windowStart = now - windowMs

  // Get or create entry
  let entry = rateLimitStore.get(identifier)
  if (!entry) {
    entry = { timestamps: [] }
    rateLimitStore.set(identifier, entry)
  }

  // Remove old timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  // Check if limit exceeded
  const currentAttempts = entry.timestamps.length
  const limited = currentAttempts >= maxAttempts

  if (!limited) {
    // Add current timestamp
    entry.timestamps.push(now)
  }

  const remaining = Math.max(0, maxAttempts - currentAttempts - (limited ? 0 : 1))

  // Calculate reset time (when oldest timestamp expires)
  const oldestTimestamp = entry.timestamps[0] || now
  const resetAt = new Date(oldestTimestamp + windowMs)

  return { limited, remaining, resetAt }
}

export async function middleware(req: NextRequest) {
  // Generate or retrieve request ID for tracing
  // Use Web Crypto API (available in Edge Runtime)
  const requestId = req.headers.get("X-Request-ID") || crypto.randomUUID()

  // === GLOBAL RATE LIMITING ===
  // Exempt static assets and certain paths from rate limiting
  const isStaticAsset =
    req.nextUrl.pathname.startsWith("/_next/static") ||
    req.nextUrl.pathname.startsWith("/_next/image") ||
    req.nextUrl.pathname === "/favicon.ico" ||
    req.nextUrl.pathname.startsWith("/uploads")

  if (!isStaticAsset) {
    // Get client identifier (IP address)
    const identifier =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"

    // Global rate limit: 60 requests/minute per IP (hardcoded for performance)
    const { limited, remaining, resetAt } = checkRateLimit(identifier, 60, 1)

    if (limited) {
      // Return 429 Too Many Requests
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          message: "You have exceeded the rate limit. Please try again later.",
          retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": resetAt.toISOString(),
            "X-Request-ID": requestId,
          },
        }
      )
    }
  }

  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup")
  const isProtectedPage =
    req.nextUrl.pathname.startsWith("/profile") ||
    req.nextUrl.pathname.startsWith("/admin") ||
    req.nextUrl.pathname.startsWith("/arbitrage-spot") ||
    req.nextUrl.pathname.startsWith("/arbitrage-futures")

  // Check for session cookie (basic check, not validating against DB)
  const sessionCookie = req.cookies.get(
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token"
  )
  const hasSessionCookie = !!sessionCookie

  // Determine response
  let response: NextResponse

  // If has cookie and on auth page, redirect to profile
  // (Real validation happens client-side - if session is invalid, user gets logged out)
  if (hasSessionCookie && isAuthPage) {
    response = NextResponse.redirect(new URL("/profile", req.url))
  }
  // If no cookie and on protected page, redirect to login
  else if (!hasSessionCookie && isProtectedPage) {
    response = NextResponse.redirect(new URL("/login", req.url))
  }
  // Continue normally
  else {
    response = NextResponse.next()
  }

  // Add Security Headers
  const securityHeaders = {
    // Prevent clickjacking attacks
    "X-Frame-Options": "DENY",

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Enable browser XSS protection
    "X-XSS-Protection": "1; mode=block",

    // Control referrer information
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Enforce HTTPS in production
    ...(process.env.NODE_ENV === "production" && {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    }),

    // Content Security Policy
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js
      "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Ant Design
      "img-src 'self' data: https: blob:", // Allow external images
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com https://*.google.com", // Google OAuth
      "frame-src 'self' https://accounts.google.com", // Google OAuth
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),

    // Permissions Policy
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
    ].join(", "),
  }

  // Apply security headers to response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add request ID to response headers for tracing
  response.headers.set("X-Request-ID", requestId)

  // CORS headers for API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "*"
    )
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    )
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Request-ID, X-CSRF-Token"
    )
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - uploads folder
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
}
