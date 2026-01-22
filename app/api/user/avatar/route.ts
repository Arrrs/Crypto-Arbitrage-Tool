import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, unlink, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import sharp from "sharp"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

export async function POST(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const requestId = getRequestId(request)
    const formData = await request.formData()
    const file = formData.get("avatar") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "avatars")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Delete old avatar if exists
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    if (user?.image && user.image.startsWith("/uploads/avatars/")) {
      const oldImagePath = join(process.cwd(), "public", user.image)
      if (existsSync(oldImagePath)) {
        await unlink(oldImagePath)
      }
    }

    // Generate unique filename (always use webp for optimization)
    const timestamp = Date.now()
    const filename = `${session.user.id}-${timestamp}.webp`
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and optimize with sharp
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Optimize image: resize to 400x400, convert to WebP, and compress
    const optimizedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 90 })
      .toBuffer()

    await writeFile(filepath, optimizedBuffer)

    // Update user's image URL in database
    const imageUrl = `/uploads/avatars/${filename}`
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    })

    return NextResponse.json({
      imageUrl,
      message: "Avatar uploaded successfully",
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Avatar upload error", {
      category: "api",
      requestId,
      userId: session.user.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Validate CSRF token first
  const csrfError = await validateCsrfToken(request)
  if (csrfError) return csrfError

  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const requestId = getRequestId(request)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    // Delete avatar file if it's a local upload
    if (user?.image && user.image.startsWith("/uploads/avatars/")) {
      const imagePath = join(process.cwd(), "public", user.image)
      if (existsSync(imagePath)) {
        await unlink(imagePath)
      }
    }

    // Update user's image to null
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    })

    return NextResponse.json({
      message: "Avatar removed successfully",
    })
  } catch (error) {
    const requestId = getRequestId(request)
    await logger.error("Avatar delete error", {
      category: "api",
      requestId,
      userId: session.user.id,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    )
  }
}
