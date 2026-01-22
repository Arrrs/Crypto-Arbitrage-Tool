import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

/**
 * NextAuth.js Configuration
 *
 * ARCHITECTURE NOTE:
 * This config only includes OAuth providers (Google).
 * Credentials login is handled via custom API endpoint at /app/api/auth/login/route.ts
 *
 * Why custom credentials endpoint?
 * - Need to capture session metadata (IP, location, device) at login time
 * - Need to support 2FA with session-level verification flags
 * - Next.js 15 + NextAuth adapter limitations with headers() in authorize()
 *
 * The custom approach allows full control while still using NextAuth for:
 * - OAuth flows (Google, GitHub, etc.)
 * - Session validation via auth()
 * - SessionProvider on client
 */
export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
} satisfies NextAuthConfig
