import { z } from "zod"

/**
 * Password validation schema following modern security standards (NIST SP 800-63B)
 *
 * Modern approach:
 * - Minimum 8 characters (complexity through length, not character requirements)
 * - Maximum 128 characters (prevent DoS attacks from extremely long passwords)
 * - Supports all Unicode characters (Cyrillic, Chinese, Arabic, emoji, etc.)
 * - No specific character type requirements (research shows they reduce password strength)
 * - Length > Complexity (longer passwords are stronger than "complex" short ones)
 *
 * Industry standard: Google, Microsoft, GitHub, Discord all use this approach
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .refine((password) => {
    // Reject passwords that are only whitespace
    return password.trim().length > 0
  }, "Password cannot be only whitespace")
  .refine((password) => {
    // Optional: Check for at least some variety (not all same character)
    // This prevents "aaaaaaaa" but allows "Еуіе123!" or any Unicode
    const uniqueChars = new Set(password).size
    return uniqueChars >= 3
  }, "Password must contain at least 3 different characters")

/**
 * User registration schema
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
})

/**
 * Password change schema (for authenticated users)
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  })

/**
 * Password reset schema (with token)
 */
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

/**
 * Email schema (reusable)
 */
export const emailSchema = z.string().email("Invalid email address")

/**
 * Password requirements for UI display (Modern NIST standards)
 */
export const PASSWORD_REQUIREMENTS = [
  "At least 8 characters long (longer is better - aim for 12+)",
  "Can use any characters: letters, numbers, symbols, spaces, Unicode (Cyrillic, emoji, etc.)",
  "At least 3 different characters (prevents 'aaaaaaaa')",
  "Avoid common passwords like 'Password123' or 'Qwerty123'",
] as const

/**
 * Check password strength (0-5) - Modern approach focusing on length and entropy
 * Supports Unicode characters (Cyrillic, Chinese, emoji, etc.)
 * @param password Password to check
 * @returns Strength score (0 = very weak, 5 = very strong)
 */
export function checkPasswordStrength(password: string): {
  score: number
  feedback: string
} {
  let score = 0
  const feedback: string[] = []

  // Length-based scoring (most important factor)
  if (password.length >= 8) score++
  else feedback.push("Use at least 8 characters")

  if (password.length >= 12) score++
  else if (password.length >= 8) feedback.push("Longer passwords are stronger - aim for 12+")

  if (password.length >= 16) score++

  // Character variety (using Unicode-aware checks)
  const uniqueChars = new Set(password).size
  const varietyRatio = uniqueChars / password.length

  if (varietyRatio >= 0.4) score++ // Good variety
  else if (varietyRatio < 0.3) feedback.push("Use more different characters")

  // Check for numbers
  if (/\d/.test(password)) score++
  else feedback.push("Add some numbers")

  // Check for non-alphanumeric (including Unicode punctuation)
  if (/[^\p{L}\p{N}]/u.test(password)) score++
  else feedback.push("Add symbols or special characters")

  // Penalty for common weak patterns
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1)
    feedback.push("Avoid repeating characters (like 'aaa')")
  }

  if (/^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 2)
    feedback.push("Don't use only numbers")
  }

  // Check for sequential characters (123, abc, etc.)
  if (/(?:abc|bcd|cde|def|123|234|345|456|567|678|789)/i.test(password)) {
    score = Math.max(0, score - 1)
    feedback.push("Avoid sequential patterns")
  }

  // Cap score at 5
  score = Math.min(5, score)

  return {
    score,
    feedback: feedback.length > 0 ? feedback.join(". ") : "Strong password!",
  }
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): {
  label: string
  color: "error" | "warning" | "success"
} {
  if (score <= 1) return { label: "Very Weak", color: "error" }
  if (score === 2) return { label: "Weak", color: "error" }
  if (score === 3) return { label: "Fair", color: "warning" }
  if (score === 4) return { label: "Good", color: "success" }
  return { label: "Strong", color: "success" }
}

/**
 * Validate password without throwing
 * @returns Object with success status and errors
 */
export function validatePassword(password: string): {
  success: boolean
  errors: string[]
} {
  try {
    passwordSchema.parse(password)
    return { success: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((e) => e.message),
      }
    }
    return { success: false, errors: ["Invalid password"] }
  }
}
