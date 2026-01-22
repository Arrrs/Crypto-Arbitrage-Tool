"use client"

import { useState, useCallback, useRef } from "react"
import { Button, Space, Avatar, message, Slider, Typography, theme as antdTheme, Flex, App, Modal } from "antd"
import { UploadOutlined, DeleteOutlined, UserOutlined, CameraOutlined } from "@ant-design/icons"
import type { RcFile } from "antd/es/upload"
import Cropper from "react-easy-crop"
import type { Point, Area } from "react-easy-crop"

const { Text } = Typography

interface AvatarUploadProps {
  currentImage?: string | null
  onImageUpdate: (imageUrl: string | null) => void
  size?: number
  csrfToken?: string | null
}

export default function AvatarUpload({ currentImage, onImageUpdate, size = 120, csrfToken }: AvatarUploadProps) {
  const { token } = antdTheme.useToken()
  const { modal } = App.useApp()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.addEventListener("load", () => resolve(reader.result as string))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (file: RcFile) => {
    try {
      const imageDataUrl = await readFile(file)
      setImageSrc(imageDataUrl)
      setIsCropModalOpen(true)
    } catch (e) {
      message.error("Failed to load image")
    }
    return false // Prevent auto upload
  }

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob | null> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      return null
    }

    // Set canvas size to the cropped area
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, "image/jpeg", 0.95)
    })
  }

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      return
    }

    try {
      setIsUploading(true)
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)

      if (!croppedImage) {
        message.error("Failed to crop image")
        return
      }

      // Create FormData to upload
      const formData = new FormData()
      formData.append("avatar", croppedImage, "avatar.jpg")

      // Upload to server
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        headers,
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        message.success("Avatar updated successfully")
        onImageUpdate(data.imageUrl)
        setIsCropModalOpen(false)
        setImageSrc(null)
        setZoom(1)
        setCrop({ x: 0, y: 0 })
      } else {
        message.error(data.error || "Failed to upload avatar")
      }
    } catch (error) {
      message.error("Failed to update avatar")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveAvatar = () => {
    modal.confirm({
      title: "Remove Avatar",
      content: "Are you sure you want to remove your profile picture? This action cannot be undone.",
      okText: "Remove",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const headers: Record<string, string> = {}
          if (csrfToken) {
            headers["x-csrf-token"] = csrfToken
          }

          const response = await fetch("/api/user/avatar", {
            method: "DELETE",
            headers,
          })

          if (response.ok) {
            message.success("Avatar removed successfully")
            onImageUpdate(null)
          } else {
            message.error("Failed to remove avatar")
          }
        } catch (error) {
          message.error("Failed to remove avatar")
        }
      },
    })
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Flex vertical>
      <Space direction="vertical" align="center" style={{ width: "100%" }}>
        {/* Avatar Display */}
        <Flex
          style={{
            position: "relative",
            cursor: "pointer",
          }}
          onClick={handleAvatarClick}
        >
          <Avatar
            size={size}
            src={currentImage}
            icon={!currentImage && <UserOutlined />}
            style={{
              backgroundColor: currentImage ? "transparent" : token.colorPrimary,
            }}
          />
          <Flex
            align="center"
            justify="center"
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              background: token.colorPrimary,
              borderRadius: "50%",
              width: 32,
              height: 32,
              border: `2px solid ${token.colorBgContainer}`,
            }}
          >
            <CameraOutlined style={{ color: token.colorTextLightSolid, fontSize: 14 }} />
          </Flex>
        </Flex>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFileSelect(file as RcFile)
            }
          }}
        />

        {/* Action Buttons */}
        <Space>
          <Button
            icon={<UploadOutlined />}
            onClick={handleAvatarClick}
          >
            Change Photo
          </Button>
          {currentImage && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemoveAvatar}
            >
              Remove
            </Button>
          )}
        </Space>

        <Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
          Click avatar or button to upload. JPG, PNG or GIF. Max size 5MB.
        </Text>
      </Space>

      {/* Crop Modal */}
      <Modal
        title="Adjust Your Photo"
        open={isCropModalOpen}
        onOk={handleCropConfirm}
        onCancel={() => {
          setIsCropModalOpen(false)
          setImageSrc(null)
          setZoom(1)
          setCrop({ x: 0, y: 0 })
        }}
        okText="Save"
        cancelText="Cancel"
        confirmLoading={isUploading}
        width={600}
      >
        <Flex vertical style={{ marginTop: 16 }}>
          <Flex
            style={{
              position: "relative",
              width: "100%",
              height: 400,
              background: token.colorBgElevated,
            }}
          >
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </Flex>
          <Flex vertical style={{ marginTop: 24 }}>
            <Text>Zoom</Text>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(value) => setZoom(value)}
            />
          </Flex>
        </Flex>
      </Modal>
    </Flex>
  )
}
