import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import { ExtendedPrismaAdapter } from "@/lib/prisma-adapter-extended"
import { prisma } from "@/lib/prisma"
import { logSessionActivity, logger } from "@/lib/logger"
import { checkLoginRateLimit, checkSuspiciousActivity } from "@/lib/auth-rate-limit"

// Session configuration from environment
const SESSION_MAX_AGE_DAYS = parseInt(process.env.SESSION_MAX_AGE_DAYS || "30", 10)
const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: ExtendedPrismaAdapter(),
  trustHost: true,
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 24 * 60 * 60, // 24 hours
  },
  ...authConfig,
  logger: {
    async error(code, ...message) {
      // Log failed login attempts to database
      if (code instanceof Error && code.name === "CredentialsSignin") {
        try {
          const { headers } = await import("next/headers")
          const headersList = await headers()

          // Extract email from error context if available
          const errorMessage = message.find(m => typeof m === 'object' && m !== null)
          const email = errorMessage && typeof errorMessage === 'object' && 'email' in errorMessage
            ? (errorMessage as any).email
            : null

          // Try to find user by email to get userId (if exists)
          let userId: string | null = null
          if (email) {
            const user = await prisma.user.findFirst({
              where: {
                email: {
                  equals: email,
                  mode: 'insensitive'
                }
              },
              select: { id: true }
            })
            userId = user?.id || null
          }

          // Log failed login attempt
          if (userId) {
            const mockRequest = {
              headers: {
                get: (name: string) => headersList.get(name)
              }
            } as Request

            await logSessionActivity(
              userId,
              "LOGIN",
              {
                method: "credentials",
                success: false,
                failReason: code.message || "Invalid credentials",
                request: mockRequest,
              }
            )
          }

          // Also log to AppLog for monitoring
          await logger.warn("Failed login attempt", {
            category: "security",
            metadata: {
              email,
              reason: code.message || "Invalid credentials",
              errorType: code.name
            },
          })
        } catch (error) {
          // Silently fail - logging system error shouldn't break auth
        }
        return
      }
      // Log other non-auth errors to logger
      if (process.env.NODE_ENV === "development") {
        console.error(`[auth][error]`, code, ...message)
      }
    },
    warn(code) {
      // Only log warnings in development
      if (process.env.NODE_ENV === "development") {
        console.warn(`[auth][warn]`, code)
      }
    },
    debug(code, ...message) {
      // Debug logs disabled for cleaner console output
      // Uncomment below to enable debug logging:
      // if (process.env.NODE_ENV === "development") {
      //   console.log(`[auth][debug]`, code, ...message)
      // }
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Set to false for local development
      },
    },
  },
  callbacks: {
    // Merge the signIn callback from authConfig
    async signIn({ user, account, profile }) {
      // Check rate limiting for credentials-based login
      if (account?.provider === "credentials") {
        try {
          const { headers } = await import("next/headers")
          const headersList = await headers()

          const ip = headersList.get("x-forwarded-for") ||
                    headersList.get("x-real-ip") ||
                    "unknown"

          // Check if IP is rate limited
          const rateLimitCheck = await checkLoginRateLimit(ip, user.email || undefined)

          if (rateLimitCheck.blocked) {
            await logger.warn("Login blocked by rate limit", {
              category: "security",
              metadata: {
                ip,
                email: user.email,
                reason: rateLimitCheck.reason,
                resetAt: rateLimitCheck.resetAt.toISOString(),
              },
            })
            // Returning false will prevent the sign in
            return false
          }

          // Check for suspicious activity
          const suspiciousCheck = await checkSuspiciousActivity(ip)
          if (suspiciousCheck.suspicious) {
            await logger.warn("Suspicious login activity detected", {
              category: "security",
              metadata: {
                ip,
                email: user.email,
                reason: suspiciousCheck.reason,
              },
            })
            // Continue but log the suspicious activity
          }
        } catch (error) {
          // On error, allow the login (fail open)
          await logger.error("Rate limit check failed during sign in", {
            category: "security",
            metadata: { error: error instanceof Error ? error.message : String(error) },
          })
        }
      }

      // Handle Google OAuth sign in - link account to existing user if needed
      // NOTE: New user creation is handled by NextAuth's adapter automatically
      // We only handle account linking for existing users (e.g., user created via credentials)
      if (account?.provider === "google" && user.email) {
        try {
          // Normalize email to lowercase for consistency
          const normalizedEmail = user.email.toLowerCase().trim()

          // Check if user with this email already exists (created via credentials)
          const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
              accounts: {
                where: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                }
              }
            }
          })

          if (existingUser) {
            // User exists (created via credentials) - check if OAuth account is linked
            const accountAlreadyLinked = existingUser.accounts.length > 0

            if (!accountAlreadyLinked) {
              // Link OAuth account to existing credentials user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              })

              await logger.info("OAuth account linked to existing user", {
                category: "auth",
                userId: existingUser.id,
                metadata: { email: normalizedEmail, provider: account.provider },
              })
            }

            // Update existing user with OAuth data
            await prisma.user.update({
              where: { email: normalizedEmail },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
                emailVerified: new Date(),
              },
            })

            // Update user object with database ID for session
            user.id = existingUser.id
            user.role = existingUser.role
            user.email = normalizedEmail
            user.emailVerified = new Date()

            await logger.info("Google OAuth user signed in (existing user)", {
              category: "auth",
              userId: existingUser.id,
            })
          }
          // If user doesn't exist, NextAuth's adapter will create it automatically
          // No need to create user manually here
        } catch (error) {
          await logger.error("Google OAuth account linking failed", {
            category: "auth",
            metadata: {
              email: user.email,
              error: error instanceof Error ? error.message : String(error)
            },
          })
          // Don't return false - let NextAuth's adapter handle new user creation
        }
      }
      // DEBUG: Check if signIn callback is being called
      console.log("[Auth.signIn] Callback triggered", { userId: user?.id, hasAccount: !!account })

      // Log successful login and capture session metadata
      if (user?.id && account) {
        try {
          // Get request from headers
          const { headers } = await import("next/headers")
          const headersList = await headers()

          // Create a mock request object with headers
          const mockRequest = {
            headers: {
              get: (name: string) => headersList.get(name)
            }
          } as Request

          await logSessionActivity(
            user.id,
            "LOGIN",
            {
              method: account.provider || "credentials",
              success: true,
              request: mockRequest,
            }
          )

          await logger.info(`User logged in: ${user.email}`, {
            category: "auth",
            metadata: { userId: user.id, method: account.provider || "credentials" },
          })

          // NOTE: Session metadata (userAgent, IP, location) is captured in the adapter's
          // createSession method for OAuth logins. For credentials logins, it's captured
          // in /api/auth/login before the session is created.
        } catch (error) {
          // Silently fail - logging error shouldn't break authentication
        }
      }

      return true
    },
    async session({ session, user }) {
      // With database sessions, we get the user from the database
      // Add additional fields to the session
      if (user && session.user) {
        session.user.id = user.id
        session.user.role = user.role as string
        session.user.name = user.name
        session.user.email = user.email
        session.user.image = user.image
        session.user.emailVerified = user.emailVerified
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
