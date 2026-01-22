"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, Button, Alert, Spin, Result, Space, Flex, theme, Typography, Divider } from "antd"
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, ArrowDownOutlined } from "@ant-design/icons"

const { Text, Title } = Typography

function CancelEmailChangeContent() {
  const { token: themeToken } = theme.useToken()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(false)
  const [fetchingDetails, setFetchingDetails] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [oldEmail, setOldEmail] = useState("")
  const [newEmail, setNewEmail] = useState("")

  // Fetch email change details on mount
  useEffect(() => {
    if (token) {
      fetchEmailChangeDetails()
    } else {
      setFetchingDetails(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const fetchEmailChangeDetails = async () => {
    try {
      const response = await fetch(`/api/user/email/cancel?cancelToken=${token}`)
      const data = await response.json()

      if (response.ok) {
        setOldEmail(data.oldEmail)
        setNewEmail(data.newEmail)
      } else {
        setError(data.error || "Failed to load email change details")
      }
    } catch (err) {
      setError("Failed to load email change details")
    } finally {
      setFetchingDetails(false)
    }
  }

  const handleCancel = async () => {
    if (!token) {
      setError("Invalid cancellation link")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/user/email/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelToken: token }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setMessage(data.message)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?message=Email change cancelled successfully")
        }, 3000)
      } else {
        setError(data.error || "Failed to cancel email change")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
        <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Result
            status="error"
            title="Invalid Link"
            subTitle="This cancellation link is invalid or has been tampered with."
            extra={
              <Button type="primary" size="large" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            }
          />
        </Card>
      </Flex>
    )
  }

  if (fetchingDetails) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
        <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Result
            icon={<Spin size="large" />}
            title="Loading details..."
            subTitle="Please wait while we load the email change details."
          />
        </Card>
      </Flex>
    )
  }

  if (success) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
        <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: themeToken.colorSuccess }} />}
            title="Email Change Cancelled"
            subTitle={message || "Your email address remains unchanged."}
            extra={
              <Button type="primary" size="large" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            }
          />
        </Card>
      </Flex>
    )
  }

  // Show error state when cancellation link is invalid/expired/already-used
  // Don't show the cancel button in these cases
  if (error && !oldEmail && !newEmail) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
        <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Result
            status="error"
            title="Cannot Cancel Email Change"
            subTitle={error}
            extra={
              <Button type="primary" size="large" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            }
          />
        </Card>
      </Flex>
    )
  }

  return (
    <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
      <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <Flex vertical align="center" gap={8}>
            <WarningOutlined style={{ fontSize: 48, color: themeToken.colorWarning }} />
            <Title level={3} style={{ margin: 0 }}>
              Cancel Email Change
            </Title>
          </Flex>

          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError("")}
            />
          )}

          <Alert
            message="Are you sure you want to cancel this email change?"
            description="This action will prevent your email from being changed. If you didn't request this email change, click the button below to cancel it."
            type="warning"
            showIcon
          />

          {/* Email Change Preview */}
          {oldEmail && newEmail && (
            <div>
              <Divider orientation="left" style={{ marginTop: 0 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Email Change Details
                </Text>
              </Divider>

              <Flex
                vertical
                align="center"
                gap={12}
                style={{
                  padding: "20px",
                  background: themeToken.colorBgContainer,
                  border: `1px solid ${themeToken.colorBorder}`,
                  borderRadius: themeToken.borderRadius,
                }}
              >
                {/* Current Email */}
                <Flex vertical align="center" gap={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Current Email
                  </Text>
                  <Text
                    strong
                    style={{
                      fontSize: 16,
                      fontFamily: "monospace",
                    }}
                  >
                    {oldEmail}
                  </Text>
                </Flex>

                {/* Arrow */}
                <ArrowDownOutlined
                  style={{
                    fontSize: 20,
                    color: themeToken.colorTextSecondary,
                  }}
                />

                {/* New Email */}
                <Flex vertical align="center" gap={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    New Email (will be cancelled)
                  </Text>
                  <Text
                    strong
                    style={{
                      fontSize: 16,
                      color: themeToken.colorError,
                      fontFamily: "monospace",
                      textDecoration: "line-through",
                    }}
                  >
                    {newEmail}
                  </Text>
                </Flex>
              </Flex>
            </div>
          )}

          {/* Action Buttons */}
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Button
              type="primary"
              danger
              block
              size="large"
              onClick={handleCancel}
              loading={loading}
              icon={<CloseCircleOutlined />}
            >
              Cancel Email Change
            </Button>

            <Button
              block
              size="large"
              onClick={() => router.push("/login")}
              disabled={loading}
            >
              Back to Login
            </Button>
          </Space>
        </Space>
      </Card>
    </Flex>
  )
}

export default function CancelEmailChangePage() {
  return (
    <Suspense fallback={
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Spin size="large" />
      </Flex>
    }>
      <CancelEmailChangeContent />
    </Suspense>
  )
}
