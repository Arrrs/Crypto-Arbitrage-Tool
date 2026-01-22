"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, Button, Alert, Spin, Result, Space, Flex, theme, Typography } from "antd"
import { CheckCircleOutlined, MailOutlined } from "@ant-design/icons"

const { Title } = Typography

function VerifyEmailChangeContent() {
  const { token: themeToken } = theme.useToken()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [autoVerifying, setAutoVerifying] = useState(false)

  const handleVerify = async () => {
    if (!token) {
      setError("Invalid verification link")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/user/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setMessage(data.message)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?message=Email verified successfully! You can now login with your new email address.")
        }, 3000)
      } else {
        setError(data.error || "Failed to verify email change")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-verify on mount if token exists
  useEffect(() => {
    if (token && !autoVerifying && !success && !error) {
      setAutoVerifying(true)
      handleVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]) // handleVerify is stable, autoVerifying/success/error are guards

  if (!token) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
        <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Result
            status="error"
            title="Invalid Link"
            subTitle="This verification link is invalid or has been tampered with."
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

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
        <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Result
            icon={<Spin size="large" />}
            title="Verifying your email address..."
            subTitle="Please wait while we verify your email change."
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
            title="Email Verified Successfully!"
            subTitle={message || "Your email address has been updated. You can now login with your new email."}
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

  if (error) {
    // Check if error is due to expiration
    const isExpired = error.toLowerCase().includes("expired")

    return (
      <Flex align="center" justify="center" style={{ minHeight: "100vh", padding: "24px", background: themeToken.colorBgLayout }}>
        <Card style={{ maxWidth: 480, width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <Result
            status="error"
            title="Verification Failed"
            subTitle={error}
            extra={
              <Space>
                <Button size="large" onClick={() => router.push("/login")}>
                  Go to Login
                </Button>
                {isExpired ? (
                  <Button type="primary" size="large" onClick={() => router.push("/profile/settings")}>
                    Go to Profile Settings
                  </Button>
                ) : (
                  <Button type="primary" size="large" onClick={handleVerify} loading={loading}>
                    Try Again
                  </Button>
                )}
              </Space>
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
          <Flex vertical align="center" gap={8}>
            <MailOutlined style={{ fontSize: 48, color: themeToken.colorPrimary }} />
            <Title level={3} style={{ margin: 0 }}>
              Verify Email Change
            </Title>
          </Flex>

          <Alert
            message="Click the button below to verify your new email address"
            description="Once verified, your email will be updated and you can login with your new address."
            type="info"
            showIcon
          />

          <Button
            type="primary"
            block
            size="large"
            onClick={handleVerify}
            loading={loading}
            icon={<CheckCircleOutlined />}
          >
            Verify Email Address
          </Button>
        </Space>
      </Card>
    </Flex>
  )
}

export default function VerifyEmailChangePage() {
  return (
    <Suspense fallback={
      <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
        <Spin size="large" />
      </Flex>
    }>
      <VerifyEmailChangeContent />
    </Suspense>
  )
}
