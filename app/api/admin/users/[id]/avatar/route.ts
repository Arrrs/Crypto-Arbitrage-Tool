import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin"
import { logAdminAction, logger, getRequestId } from "@/lib/logger"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { validateCsrfToken } from "@/lib/csrf"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  try {
    const { id: userId } = await params

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete avatar file if it's a local upload
    if (user.image && user.image.startsWith("/uploads/avatars/")) {
      const imagePath = join(process.cwd(), "public", user.image)
      if (existsSync(imagePath)) {
        await unlink(imagePath)
      }
    }

    // Update user's image to null
    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    })

    // Log admin action for audit trail
    await logAdminAction(authResult.user.id, "DELETE_USER_AVATAR", {
      resource: "User",
      resourceId: userId,
      metadata: {
        targetUserEmail: user.email,
        previousImage: user.image,
      },
      request,
    })

    return NextResponse.json({
      message: "Avatar removed successfully",
    })
  } catch (error) {
    await logger.error("Admin avatar delete error", {
      category: "admin",
      requestId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    )
  }
}
