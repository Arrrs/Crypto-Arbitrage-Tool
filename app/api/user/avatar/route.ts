import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, unlink, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import sharp from "sharp"
import { logger, getRequestId } from "@/lib/logger"
import { validateCsrfToken } from "@/lib/csrf"

// Magic bytes for common image formats
const IMAGE_SIGNATURES: { [key: string]: number[] } = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF....WEBP)
  bmp: [0x42, 0x4d],
}

/**
 * Validate image by checking magic bytes (file signature)
 * This is more secure than trusting client-provided MIME type
 */
function isValidImageByMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false

  // Check JPEG
  if (
    buffer[0] === IMAGE_SIGNATURES.jpeg[0] &&
    buffer[1] === IMAGE_SIGNATURES.jpeg[1] &&
    buffer[2] === IMAGE_SIGNATURES.jpeg[2]
  ) {
    return true
  }

  // Check PNG
  if (
    buffer[0] === IMAGE_SIGNATURES.png[0] &&
    buffer[1] === IMAGE_SIGNATURES.png[1] &&
    buffer[2] === IMAGE_SIGNATURES.png[2] &&
    buffer[3] === IMAGE_SIGNATURES.png[3]
  ) {
    return true
  }

  // Check GIF
  if (
    buffer[0] === IMAGE_SIGNATURES.gif[0] &&
    buffer[1] === IMAGE_SIGNATURES.gif[1] &&
    buffer[2] === IMAGE_SIGNATURES.gif[2]
  ) {
    return true
  }

  // Check WebP (RIFF....WEBP)
  if (
    buffer[0] === IMAGE_SIGNATURES.webp[0] &&
    buffer[1] === IMAGE_SIGNATURES.webp[1] &&
    buffer[2] === IMAGE_SIGNATURES.webp[2] &&
    buffer[3] === IMAGE_SIGNATURES.webp[3] &&
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return true
  }

  // Check BMP
  if (buffer[0] === IMAGE_SIGNATURES.bmp[0] && buffer[1] === IMAGE_SIGNATURES.bmp[1]) {
    return true
  }

  return false
}

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

    // Validate file size first (5MB max) - check before reading into memory
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Convert to buffer for magic bytes validation
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Validate by magic bytes (more secure than MIME type)
    if (!isValidImageByMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a valid image (JPEG, PNG, GIF, WebP, or BMP)." },
        { status: 400 }
      )
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

    // Optimize image: resize to 400x400, convert to WebP, and compress
    // This also strips any potentially malicious metadata/payloads
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
