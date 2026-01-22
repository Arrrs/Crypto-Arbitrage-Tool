/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on app startup using Zod.
 * Prevents runtime errors from missing or invalid configuration.
 *
 * Based on best practices from T3 Stack and Vercel.
 *
 * Usage:
 *   import { env } from "@/lib/env"
 *   const dbUrl = env.DATABASE_URL  // Type-safe and validated
 */

import { z } from "zod"

// Environment schema with validation rules
const envSchema = z.object({
  // ===================================
  // DATABASE (Required)
  // ===================================
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid URL")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),

  // ===================================
  // AUTHENTICATION (Required)
  // ===================================
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters for security")
    .describe("Secret for JWT signing - generate with: openssl rand -base64 32"),

  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL must be a valid URL")
    .optional()
    .describe("Application URL - auto-detected in development"),

  SESSION_MAX_AGE_DAYS: z
    .string()
    .optional()
    .default("30")
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 365, "SESSION_MAX_AGE_DAYS must be between 1 and 365 days")
    .describe("Session duration in days (default: 30)"),

  // ===================================
  // OAUTH PROVIDERS (Optional)
  // ===================================
  GOOGLE_CLIENT_ID: z
    .string()
    .min(1)
    .optional()
    .describe("Google OAuth Client ID from Google Cloud Console"),

  GOOGLE_CLIENT_SECRET: z
    .string()
    .min(1)
    .optional()
    .describe("Google OAuth Client Secret"),

  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

  // ===================================
  // EMAIL / SMTP (Optional)
  // ===================================
  SMTP_HOST: z.string().min(1).optional().describe("SMTP server hostname"),

  SMTP_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .describe("SMTP server port (typically 587 for TLS)"),

  SMTP_USER: z.string().min(1).optional().describe("SMTP username/email"),

  SMTP_PASS: z.string().min(1).optional().describe("SMTP password or app password"),

  SMTP_FROM: z
    .string()
    .email("SMTP_FROM must be a valid email")
    .optional()
    .describe("From email address"),

  // ===================================
  // TELEGRAM (Optional)
  // ===================================
  TELEGRAM_BOT_TOKEN: z
    .string()
    .regex(/^\d+:[A-Za-z0-9_-]+$/, "Invalid Telegram bot token format")
    .optional()
    .describe("Telegram bot token from @BotFather"),

  TELEGRAM_CHAT_ID: z
    .string()
    .regex(/^-?\d+$/, "Telegram chat ID must be a number")
    .optional()
    .describe("Telegram chat ID from @userinfobot"),

  // ===================================
  // APPLICATION (Required)
  // ===================================
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Node environment"),

  // ===================================
  // DOCKER / PRODUCTION (Optional)
  // ===================================
  POSTGRES_USER: z
    .string()
    .min(1)
    .optional()
    .describe("PostgreSQL username for Docker"),

  POSTGRES_PASSWORD: z
    .string()
    .min(8, "POSTGRES_PASSWORD should be at least 8 characters")
    .optional()
    .describe("PostgreSQL password for Docker"),

  POSTGRES_DB: z
    .string()
    .min(1)
    .optional()
    .describe("PostgreSQL database name for Docker"),

  METABASE_DB_PASS: z
    .string()
    .min(8, "METABASE_DB_PASS should be at least 8 characters")
    .optional()
    .describe("Metabase database password for Docker"),

  // ===================================
  // RATE LIMITING (Optional - has defaults)
  // ===================================
  RATE_LIMIT_LOGIN_MAX: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),

  RATE_LIMIT_LOGIN_WINDOW: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),

  // ===================================
  // SECURITY (Optional)
  // ===================================
  CSRF_SECRET: z
    .string()
    .min(32, "CSRF_SECRET must be at least 32 characters")
    .optional()
    .describe("CSRF protection secret"),

  // ===================================
  // MONITORING (Optional)
  // ===================================
  SENTRY_DSN: z
    .string()
    .url("SENTRY_DSN must be a valid URL")
    .optional()
    .describe("Sentry error tracking DSN"),

  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug"])
    .optional()
    .default("info")
    .describe("Application log level"),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates environment variables and returns typed environment object
 * Throws detailed error if validation fails
 *
 * @throws {Error} If environment validation fails with detailed error messages
 * @returns {Env} Validated and typed environment variables
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingOrInvalid = error.errors.map((err) => {
        const path = err.path.join(".")
        return `  ❌ ${path}: ${err.message}`
      })

      console.error("\n" + "=".repeat(60))
      console.error("❌ ENVIRONMENT VALIDATION FAILED")
      console.error("=".repeat(60))
      console.error("\nThe following environment variables are missing or invalid:\n")
      console.error(missingOrInvalid.join("\n"))
      console.error("\n" + "=".repeat(60))
      console.error("📝 Fix Instructions:")
      console.error("=".repeat(60))
      console.error("1. Copy .env.example to .env: cp .env.example .env")
      console.error("2. Set required variables (DATABASE_URL, AUTH_SECRET)")
      console.error("3. Generate AUTH_SECRET: openssl rand -base64 32")
      console.error("4. Restart the application")
      console.error("=".repeat(60) + "\n")

      throw new Error("Invalid environment configuration - see details above")
    }
    throw error
  }
}

/**
 * Validated and typed environment variables
 * Import this instead of process.env for type safety
 *
 * @example
 * import { env } from "@/lib/env"
 * const dbUrl = env.DATABASE_URL // Type-safe!
 */
export const env = validateEnv()

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === "production"

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === "development"

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === "test"
