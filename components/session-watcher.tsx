"use client"

import { useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"

/**
 * Session Watcher Component
 *
 * Monitors session validity and automatically signs out user when:
 * - Session is revoked (deleted from database)
 * - Session expires
 * - Session becomes invalid
 *
 * This ensures that when a session is revoked on another device,
 * the user is logged out immediately on next session check (60s in dev, 5min in prod)
 *
 * Place this component in the root layout or providers.
 */
export function SessionWatcher() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const hasSignedOut = useRef(false)
  const wasAuthenticated = useRef(false) // Track if user was ever authenticated

  useEffect(() => {
    // Track if user becomes authenticated
    if (status === "authenticated") {
      wasAuthenticated.current = true
      hasSignedOut.current = false
    }

    // Don't act if on auth-related pages (login, signup, 2FA verification, email verification)
    const isAuthPage =
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/signup") ||
      pathname?.startsWith("/verify-2fa") ||
      pathname?.startsWith("/verify-email") ||
      pathname?.startsWith("/forgot-password") ||
      pathname?.startsWith("/reset-password")

    if (isAuthPage) {
      return
    }

    // Only act when:
    // 1. Status is unauthenticated
    // 2. User WAS previously authenticated (not just browsing while logged out)
    // 3. We haven't already handled the signout
    if (status === "unauthenticated" && wasAuthenticated.current && !hasSignedOut.current) {
      hasSignedOut.current = true

      // Check if this was an intentional logout
      const intentionalLogout = sessionStorage.getItem("intentional_logout")

      if (intentionalLogout) {
        // Clear the flag and don't show error message
        sessionStorage.removeItem("intentional_logout")
        return
      }

      // Session is invalid - sign out and clear cookie
      signOut({ redirect: false }).then(() => {
        // Redirect to login with message
        router.push("/login?error=Your session has expired or been revoked")
      })
    }
  }, [status, pathname, router])

  return null // This component doesn't render anything
}
