import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Zod schema for input validation - whitelist allowed values
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  adminVerified: z.boolean().default(false),
  isPaid: z.boolean().default(false),
  paidUntil: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token first
    const csrfError = await validateCsrfToken(request)
    if (csrfError) return csrfError

    // Secure admin authorization with database validation
    const authResult = await requireAdmin()

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const requestId = getRequestId(request)
    const body = await request.json()

    // Validate input with Zod schema
    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, role, adminVerified, isPaid, paidUntil } = validation.data

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password if provided
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    // Handle subscription logic
    let finalIsPaid = false
    let finalPaidUntil = null

    if (paidUntil) {
      const paidUntilDate = new Date(paidUntil)
      const now = new Date()

      // Only mark as paid if the date is in the future
      if (paidUntilDate > now) {
        finalIsPaid = true
        finalPaidUntil = paidUntilDate
      } else {
        // If date is in the past, don't mark as paid
        finalIsPaid = false
        finalPaidUntil = paidUntilDate // Still store the date for history
      }
    } else if (isPaid) {
      // If trying to mark as paid without paidUntil
      return NextResponse.json(
        { error: "Please set a subscription expiry date (paidUntil) when marking user as paid" },
        { status: 400 }
      )
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "USER",
        adminVerified: adminVerified || false,
        emailVerified: adminVerified ? new Date() : null, // Auto-verify email if admin verified
        isPaid: finalIsPaid,
        paidUntil: finalPaidUntil,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminVerified: true,
        emailVerified: true,
        isPaid: true,
        paidUntil: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log admin action for audit trail
    await logAdminAction(authResult.user.id, "CREATE_USER", {
      resource: "User",
      resourceId: user.id,
      metadata: {
        createdUserEmail: user.email,
        createdUserRole: user.role,
        isPaid: finalIsPaid,
        paidUntil: finalPaidUntil,
        adminVerified,
      },
      request,
    })

    return NextResponse.json({
      message: "User created successfully",
      user,
    })
  } catch (error) {
    await logger.error("Error creating user", {
      category: "admin",
      requestId: getRequestId(request),
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
