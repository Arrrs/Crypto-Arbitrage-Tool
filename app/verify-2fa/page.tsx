"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, Form, Input, Button, Typography, Alert, Flex, Space, Tabs, theme } from "antd"
import { LockOutlined, SafetyOutlined } from "@ant-design/icons"
import { signIn } from "next-auth/react"

const { Title, Paragraph, Text } = Typography
const { useToken } = theme

export default function Verify2FAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token: themeToken } = useToken()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("totp")
  const [form] = Form.useForm()

  // Get user ID and session token from URL (passed from login page)
  const userId = searchParams.get("userId")
  const sessionToken = searchParams.get("sessionToken")

  useEffect(() => {
    if (!userId || !sessionToken) {
      router.push("/login?error=Invalid 2FA session")
    }
  }, [userId, sessionToken, router])

  // Handle "Back to Login" - clear any partial session
  const handleBackToLogin = () => {
    // Redirect to login page
    // The auth.config.ts will prevent session creation for 2FA users
    router.push("/login")
  }

  const handleSubmit = async (values: { code: string }) => {
    setLoading(true)
    setError("")

    try {
      // Verify 2FA code
      const verifyResponse = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          code: values.code,
          isBackupCode: activeTab === "backup",
        }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok) {
        setError(verifyData.error || "Invalid verification code")
        setLoading(false)
        return
      }

      // If 2FA verification succeeded, complete the login by updating session
      const complete2FAResponse = await fetch("/api/auth/complete-2fa-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionToken,
        }),
      })

      const complete2FAData = await complete2FAResponse.json()

      if (!complete2FAResponse.ok) {
        // Check if session expired - redirect to login
        if (complete2FAData.error === "session_expired") {
          router.push("/login?error=Session expired. Please login again.")
          return
        }

        setError(complete2FAData.message || "Authentication failed. Please try again.")
        setLoading(false)
        return
      }

      // Success - force a full page reload to ensure session is updated
      // This prevents the "logged in but header shows login button" issue
      window.location.href = "/profile"
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  if (!userId) {
    return null
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: themeToken.colorBgContainer,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 450,
          boxShadow: themeToken.boxShadow,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Flex vertical align="center">
            <SafetyOutlined style={{ fontSize: 48, color: themeToken.colorPrimary }} />
            <Title level={2} style={{ margin: "16px 0 0 0", textAlign: "center" }}>
              Two-Factor Authentication
            </Title>
            <Paragraph
              type="secondary"
              style={{ margin: "8px 0 0 0", textAlign: "center" }}
            >
              Enter the 6-digit code from your authenticator app
            </Paragraph>
          </Flex>

          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key)
              // Clear input field and error when switching tabs
              form.resetFields(['code'])
              setError("")
            }}
            items={[
              {
                key: "totp",
                label: "Authenticator App",
              },
              {
                key: "backup",
                label: "Backup Code",
              },
            ]}
          />

          <Form
            name="verify-2fa"
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            autoComplete="off"
          >
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError("")}
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item
              name="code"
              label={activeTab === "totp" ? "6-Digit Code" : "Backup Code"}
              rules={[
                { required: true, message: "Please enter your code" },
                activeTab === "totp"
                  ? { len: 6, message: "Code must be exactly 6 digits" }
                  : { min: 10, message: "Backup code must be at least 10 characters" },
              ]}
            >
              <Input
                prefix={<LockOutlined style={{ color: themeToken.colorTextSecondary }} />}
                placeholder={activeTab === "totp" ? "000000" : "XXXXX-XXXXX"}
                size="large"
                maxLength={activeTab === "totp" ? 6 : 11}
                autoComplete="off"
                style={{ fontSize: "24px", letterSpacing: "8px", textAlign: "center" }}
              />
            </Form.Item>

            {activeTab === "backup" && (
              <Alert
                message="Using a backup code will invalidate it"
                description="Each backup code can only be used once. Make sure you have more backup codes available."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
              >
                Verify & Sign In
              </Button>
            </Form.Item>
          </Form>

          <Flex vertical align="center" gap={8}>
            <Text type="secondary" style={{ fontSize: "12px", textAlign: "center" }}>
              Can't access your authenticator app?
            </Text>
            <Button
              type="link"
              size="small"
              onClick={handleBackToLogin}
              style={{ padding: 0 }}
            >
              Back to Login
            </Button>
          </Flex>
        </Space>
      </Card>
    </Flex>
  )
}
