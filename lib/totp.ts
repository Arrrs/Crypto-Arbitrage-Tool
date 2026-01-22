import speakeasy from "speakeasy"
import QRCode from "qrcode"
import crypto from "crypto"
import { logger } from "./logger"

/**
 * Two-Factor Authentication (2FA) Utilities
 *
 * Implements Time-based One-Time Password (TOTP) authentication
 * using the TOTP algorithm (RFC 6238)
 */

/**
 * Generate a new 2FA secret for a user
 * Returns the secret and otpauth URL for QR code generation
 */
export function generateTOTPSecret(email: string, appName: string = "NextAuth App") {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    issuer: appName,
    length: 32,
  })

  return {
    secret: secret.base32, // Store this in database
    otpauthUrl: secret.otpauth_url || "", // For QR code
  }
}

/**
 * Generate QR code data URL for the secret
 * This can be displayed as an image in the browser
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl)
  } catch (error) {
    await logger.error("Failed to generate QR code", {
      category: "security",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    throw new Error("Failed to generate QR code")
  }
}

/**
 * Verify a TOTP token against a secret
 * Returns true if the token is valid
 *
 * @param secret The base32 encoded secret
 * @param token The 6-digit token from authenticator app
 * @param window Time window to check (default: 2 = ±60 seconds)
 */
export function verifyTOTPToken(
  secret: string,
  token: string,
  window: number = 2
): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window, // Allow 2 time steps before/after (60 seconds total grace period)
    })
  } catch (error) {
    logger.error("Failed to verify TOTP token", {
      category: "security",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return false
  }
}

/**
 * Generate backup codes for account recovery
 * These are one-time use codes in case the user loses their authenticator
 *
 * @param count Number of backup codes to generate (default: 8)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    // Generate a random 10-character code
    const code = crypto.randomBytes(5).toString("hex").toUpperCase()
    // Format as XXXXX-XXXXX for readability
    const formatted = `${code.substring(0, 5)}-${code.substring(5, 10)}`
    codes.push(formatted)
  }

  return codes
}

/**
 * Hash backup codes for secure storage
 * Backup codes should be hashed before storing in database
 */
export async function hashBackupCode(code: string): Promise<string> {
  const bcrypt = await import("bcryptjs")
  // Remove hyphen before hashing
  const normalized = code.replace("-", "")
  return await bcrypt.hash(normalized, 10)
}

/**
 * Verify a backup code against its hash
 */
export async function verifyBackupCode(
  code: string,
  hash: string
): Promise<boolean> {
  try {
    const bcrypt = await import("bcryptjs")
    // Remove hyphen before comparing
    const normalized = code.replace("-", "")
    return await bcrypt.compare(normalized, hash)
  } catch (error) {
    await logger.error("Failed to verify backup code", {
      category: "security",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return false
  }
}

/**
 * Generate a current TOTP token (for testing)
 * NOTE: Only use this for testing/debugging, never in production authentication
 */
export function generateTOTPToken(secret: string): string {
  return speakeasy.totp({
    secret,
    encoding: "base32",
  })
}

/**
 * Validate backup code format
 * Format: XXXXX-XXXXX (10 hex characters with hyphen)
 */
export function isValidBackupCodeFormat(code: string): boolean {
  return /^[0-9A-F]{5}-[0-9A-F]{5}$/i.test(code)
}

/**
 * Validate TOTP token format
 * Must be exactly 6 digits
 */
export function isValidTOTPTokenFormat(token: string): boolean {
  return /^\d{6}$/.test(token)
}

/**
 * Get time remaining until current TOTP token expires
 * Returns seconds remaining (0-30)
 */
export function getTokenTimeRemaining(): number {
  const now = Math.floor(Date.now() / 1000)
  const stepSize = 30 // TOTP tokens change every 30 seconds
  return stepSize - (now % stepSize)
}

/**
 * 2FA Setup Response Type
 */
export interface TwoFactorSetup {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  backupCodesHashed: string[]
}

/**
 * Complete 2FA setup workflow
 * Generates secret, QR code, and backup codes
 */
export async function setupTwoFactor(
  email: string,
  appName?: string
): Promise<TwoFactorSetup> {
  // Generate TOTP secret
  const { secret, otpauthUrl } = generateTOTPSecret(email, appName)

  // Generate QR code
  const qrCodeUrl = await generateQRCode(otpauthUrl)

  // Generate backup codes
  const backupCodes = generateBackupCodes(8)

  // Hash backup codes for storage
  const backupCodesHashed = await Promise.all(
    backupCodes.map((code) => hashBackupCode(code))
  )

  return {
    secret,
    qrCodeUrl,
    backupCodes, // Show these to user ONCE
    backupCodesHashed, // Store these in database
  }
}
