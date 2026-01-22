import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { z } from "zod"
import { validateCsrfToken } from "@/lib/csrf"

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const { id } = await params

  // Secure admin authorization with database validation
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  try {
    const body = await request.json()
    const { name, email, role } = updateUserSchema.parse(body)

    const updateData: { name?: string; email?: string; role?: "USER" | "ADMIN" } = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role) updateData.role = role as "USER" | "ADMIN"

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log admin action for audit trail
    await logAdminAction(authResult.user.id, "UPDATE_USER", {
      resource: "User",
      resourceId: id,
      metadata: { updates: updateData },
      request,
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    const requestId = getRequestId(request)
    await logger.error("Failed to update user", {
      category: "admin",
      requestId,
      userId: authResult.user.id,
      metadata: {
        targetUserId: id,
        error: error instanceof Error ? error.message : String(error)
      },
    })

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const { id } = await params

  // Secure admin authorization with database validation
  const authResult = await requireAdmin()

  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  // Prevent admin from deleting their own account
  if (authResult.user.id === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    )
  }

  try {
    // Get user info before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { email: true, role: true },
    })

    await prisma.user.delete({
      where: { id },
    })

    // Log admin action for audit trail
    await logAdminAction(authResult.user.id, "DELETE_USER", {
      resource: "User",
      resourceId: id,
      metadata: {
        deletedUserEmail: userToDelete?.email,
        deletedUserRole: userToDelete?.role,
      },
      request,
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Failed to delete user", {
      category: "admin",
      requestId,
      userId: authResult.user.id,
      metadata: {
        targetUserId: id,
        error: error instanceof Error ? error.message : String(error)
      },
    })

    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
