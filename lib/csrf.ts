/**
 * CSRF Protection
 *
 * Implements Double Submit Cookie pattern for CSRF protection.
 * Based on OWASP recommendations.
 *
 * Usage:
 * - GET endpoints: Set CSRF token with setCsrfTokenCookie()
 * - POST/PUT/DELETE endpoints: Validate with validateCsrfToken()
 */

import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = "csrf-token"
const CSRF_HEADER_NAME = "x-csrf-token"

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("base64url")
}

/**
 * Validate CSRF token from request
 * Returns NextResponse with error if validation fails, null if valid
 */
export async function validateCsrfToken(
  request: NextRequest
): Promise<NextResponse | null> {
  // Only validate for state-changing methods
  const method = request.method
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Both must exist and match
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      {
        error: "Invalid CSRF token",
        message: "CSRF token validation failed. Please refresh the page and try again.",
      },
      {
        status: 403,
        headers: {
          "X-CSRF-Error": "token-mismatch",
        },
      }
    )
  }

  return null
}

/**
 * Set CSRF token cookie in response
 * Call this in GET endpoints that return data for mutations
 * Reuses existing token if present to avoid token rotation issues
 */
export function setCsrfTokenCookie(response: NextResponse, request?: NextRequest): void {
  // Try to reuse existing token from request cookies
  let token = request?.cookies.get(CSRF_COOKIE_NAME)?.value

  // Only generate new token if none exists
  if (!token) {
    token = generateCsrfToken()
  }

  // Set cookie (HttpOnly for security)
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  })

  // Also set in header for client to read
  response.headers.set(CSRF_HEADER_NAME, token)
}

/**
 * Get CSRF token from request cookies
 * Used by client-side code to include in mutation requests
 */
export function getCsrfToken(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value
}
