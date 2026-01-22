import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params
    const body = await request.json()
    const { role, adminVerified, emailVerified, isPaid, paidUntil } = body

    // Build update data object
    const updateData: any = {}

    if (role !== undefined) updateData.role = role
    if (adminVerified !== undefined) {
      updateData.adminVerified = adminVerified
      // If admin verifies, also mark email as verified
      if (adminVerified && !emailVerified) {
        updateData.emailVerified = new Date()
      }
    }
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified ? new Date() : null
    }

    // Handle subscription logic
    if (paidUntil !== undefined) {
      const paidUntilDate = paidUntil ? new Date(paidUntil) : null
      updateData.paidUntil = paidUntilDate

      // Automatically set isPaid based on paidUntil date
      if (paidUntilDate) {
        const now = new Date()
        // Only mark as paid if the date is in the future
        updateData.isPaid = paidUntilDate > now
      } else {
        // If paidUntil is cleared, set isPaid to false
        updateData.isPaid = false
      }
    } else if (isPaid !== undefined) {
      // If only isPaid is changed (without paidUntil)
      if (isPaid === false) {
        // If unmarking as paid, also clear paidUntil
        updateData.isPaid = false
        updateData.paidUntil = null
      } else {
        // If marking as paid without paidUntil, don't allow it
        return NextResponse.json(
          { error: "Please set a subscription expiry date (paidUntil) when marking user as paid" },
          { status: 400 }
        )
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    // Log admin action for audit trail with detailed changes
    await logAdminAction(authResult.user.id, "UPDATE_USER_SUBSCRIPTION", {
      resource: "User",
      resourceId: id,
      metadata: {
        userEmail: user.email,
        changes: {
          role: role !== undefined ? { new: role } : undefined,
          adminVerified: adminVerified !== undefined ? { new: adminVerified } : undefined,
          emailVerified: emailVerified !== undefined ? { new: emailVerified } : undefined,
          isPaid: updateData.isPaid !== undefined ? { new: updateData.isPaid } : undefined,
          paidUntil: paidUntil !== undefined ? { new: paidUntil } : undefined,
        },
        subscription: {
          isPaid: updateData.isPaid,
          paidUntil: updateData.paidUntil,
        },
      },
      request,
    })

    return NextResponse.json({
      message: "User updated successfully",
      user,
    })
  } catch (error) {
    await logger.error("Error updating user", {
      category: "admin",
      requestId: getRequestId(request),
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}
