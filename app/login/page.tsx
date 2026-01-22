"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, Form, Input, Button, Alert, Typography, Space, Divider, Flex } from "antd"
import { UserOutlined, LockOutlined, GoogleOutlined } from "@ant-design/icons"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Paragraph, Text } = Typography

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showResendLink, setShowResendLink] = useState(false)
  const [resendEmail, setResendEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setInfo(message)
    }

    const urlError = searchParams.get("error")
    if (urlError) {
      // Don't show error for user-cancelled OAuth login
      // OAuthCallbackError typically means user clicked "Cancel" on OAuth provider
      if (urlError !== "OAuthCallbackError") {
        setError(urlError)
      }
    }

    // Pre-fill email from query parameter (e.g., after email verification)
    const emailParam = searchParams.get("email")
    if (emailParam) {
      // Use Form instance to set field value
      const form = document.querySelector('form[name="login"]') as HTMLFormElement
      if (form) {
        // Delay to ensure form is mounted
        setTimeout(() => {
          const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement
          if (emailInput) {
            emailInput.value = emailParam
            // Trigger change event for form validation
            emailInput.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }, 100)
      }
    }

    // Clear URL parameters after reading them to prevent showing on refresh
    if (message || urlError || emailParam) {
      // Use replaceState to remove query params without triggering navigation
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  const handleSubmit = async (values: { email: string; password: string }) => {
    setError("")
    setShowResendLink(false)
    setIsLoading(true)

    try {
      // Use custom login API for all logins (handles both 2FA and non-2FA)
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      })

      const loginData = await loginResponse.json()

      // Handle 2FA required - redirect to 2FA verification page
      if (loginData.error === "2fa_required") {
        router.push(
          `/verify-2fa?userId=${encodeURIComponent(loginData.userId)}&sessionToken=${encodeURIComponent(loginData.sessionToken)}`
        )
        return
      }

      if (!loginResponse.ok) {
        // Handle rate limiting
        if (loginResponse.status === 429) {
          setError(loginData.message || "Too many failed login attempts. Please try again later.")
          return
        }

        // Check if backend returned specific email verification error
        // This only happens when password is CORRECT (no email enumeration)
        if (loginData.error === "email_not_verified") {
          setError(loginData.message || "Please verify your email before signing in. Check your inbox for the verification link.")
          setShowResendLink(true)
          setResendEmail(values.email)
          return
        }

        // For all other errors (wrong password, user not found), show generic message
        setError(loginData.error || "Invalid email or password")
      } else {
        // Login successful - force full page reload to ensure session is loaded
        window.location.href = "/profile"
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResendLoading(true)
    setError("")
    setInfo("")

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setInfo(data.message)
        setShowResendLink(false)
      } else {
        setError(data.error || "Failed to resend verification email")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <SidebarLayout>
      <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 64px)', padding: '16px' }}>
        <Card style={{ maxWidth: '450px', width: '100%' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Flex vertical>
              <Title level={2}>Login</Title>
              <Paragraph type="secondary">Sign in to your account</Paragraph>
            </Flex>

          <Form
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            autoComplete="off"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your email"
                size="large"
                autoComplete="email username"
                type="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Flex justify="flex-end">
                <Link href="/forgot-password">
                  <Button type="link" style={{ padding: 0 }}>
                    Forgot password?
                  </Button>
                </Link>
              </Flex>
            </Form.Item>

            {info && (
              <Form.Item>
                <Alert message={info} type="info" showIcon />
              </Form.Item>
            )}

            {error && (
              <Form.Item>
                <Alert message={error} type="error" showIcon />
                {showResendLink && (
                  <Flex justify="center" style={{ marginTop: '8px' }}>
                    <Button
                      type="link"
                      onClick={handleResendVerification}
                      loading={resendLoading}
                    >
                      Resend Verification Email
                    </Button>
                  </Flex>
                )}
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                size="large"
                block
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Divider>Or</Divider>

          <Button
            icon={<GoogleOutlined />}
            size="large"
            block
            onClick={() => signIn("google", { callbackUrl: "/profile" })}
          >
            Continue with Google
          </Button>

          <Flex justify="center" align="center" gap={4} style={{ marginTop: '16px' }}>
            <Text type="secondary">Don't have an account?</Text>
            <Link href="/signup" style={{ marginLeft: 4 }}>Sign up</Link>
          </Flex>
          </Space>
        </Card>
      </Flex>
    </SidebarLayout>
  )
}
