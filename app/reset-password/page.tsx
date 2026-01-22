"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, Form, Input, Button, Typography, Alert, Flex, theme, Space, Progress, Spin } from "antd"
import { LockOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from "@ant-design/icons"
import { PASSWORD_REQUIREMENTS, checkPasswordStrength, getPasswordStrengthLabel } from "@/lib/validation"

const { Title, Paragraph, Link, Text } = Typography
const { useToken } = theme

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { token: themeToken } = useToken()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" })

  // Token validation state
  const [tokenStatus, setTokenStatus] = useState<'validating' | 'valid' | 'invalid' | 'expired'>('validating')
  const [validationMessage, setValidationMessage] = useState("")

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid')
      return
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (data.valid) {
          setTokenStatus('valid')
          setValidationMessage(data.message || "Token is valid")
        } else {
          setTokenStatus(data.error === 'expired' ? 'expired' : 'invalid')
          setValidationMessage(data.error === 'expired'
            ? "This reset link has expired. Please request a new one."
            : "This reset link is invalid or has already been used.")
        }
      } catch (err) {
        setTokenStatus('invalid')
        setValidationMessage("Unable to validate reset link. Please try again.")
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.")
      return
    }

    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: values.password,
          confirmPassword: values.confirmPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(data.error || "Failed to reset password")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Show validating state
  if (tokenStatus === 'validating') {
    return (
      <Flex
        align="center"
        justify="center"
        style={{
          minHeight: "100vh",
          padding: "24px",
          background: themeToken.colorBgContainer
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: 400,
            boxShadow: themeToken.boxShadow
          }}
        >
          <Flex vertical gap="middle" align="center">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Title level={4} style={{ margin: 0, textAlign: "center" }}>
              Validating Reset Link...
            </Title>
            <Text type="secondary">Please wait while we verify your password reset link.</Text>
          </Flex>
        </Card>
      </Flex>
    )
  }

  // Show invalid/expired state
  if (!token || tokenStatus === 'invalid' || tokenStatus === 'expired') {
    return (
      <Flex
        align="center"
        justify="center"
        style={{
          minHeight: "100vh",
          padding: "24px",
          background: themeToken.colorBgContainer
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: 400,
            boxShadow: themeToken.boxShadow
          }}
        >
          <Flex vertical gap="middle">
            <Title level={2} style={{ margin: 0, textAlign: "center" }}>
              {tokenStatus === 'expired' ? 'Link Expired' : 'Invalid Reset Link'}
            </Title>
            <Alert
              message={validationMessage || "This password reset link is invalid or has expired."}
              type="error"
              showIcon
            />
            <Paragraph style={{ margin: 0, textAlign: "center" }}>
              Please request a new password reset from the{" "}
              <Link href="/forgot-password">forgot password page</Link>.
            </Paragraph>
            <Button type="primary" block href="/forgot-password">
              Request New Reset Link
            </Button>
          </Flex>
        </Card>
      </Flex>
    )
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: themeToken.colorBgContainer
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: themeToken.boxShadow
        }}
      >
        <Flex vertical gap="middle">
          <Title level={2} style={{ margin: 0, textAlign: "center" }}>
            Reset Password
          </Title>
          <Paragraph style={{ margin: 0, textAlign: "center", color: themeToken.colorTextSecondary }}>
            Enter your new password below.
          </Paragraph>

          {/* Show token valid message */}
          {tokenStatus === 'valid' && validationMessage && (
            <Alert
              message="Reset Link Verified"
              description={validationMessage}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {success ? (
            <Alert
              message="Password Reset Successful"
              description="Your password has been reset. Redirecting to login..."
              type="success"
              showIcon
            />
          ) : (
            <Form
              name="reset-password"
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
                name="password"
                label="New Password"
                rules={[
                  { required: true, message: "Please enter your new password" },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve()

                      // Modern NIST SP 800-63B validation (supports Unicode)
                      if (value.length < 8) {
                        return Promise.reject(new Error("Password must be at least 8 characters"))
                      }
                      if (value.length > 128) {
                        return Promise.reject(new Error("Password must be less than 128 characters"))
                      }
                      if (value.trim().length === 0) {
                        return Promise.reject(new Error("Password cannot be only whitespace"))
                      }

                      // Check for at least 3 different characters (prevents "aaaaaaaa")
                      const uniqueChars = new Set(value).size
                      if (uniqueChars < 3) {
                        return Promise.reject(new Error("Password must contain at least 3 different characters"))
                      }

                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: themeToken.colorTextSecondary }} />}
                  placeholder="Enter new password"
                  onChange={(e) => {
                    const value = e.target.value
                    setPassword(value)
                    if (value) {
                      setPasswordStrength(checkPasswordStrength(value))
                    } else {
                      setPasswordStrength({ score: 0, feedback: "" })
                    }
                  }}
                />
              </Form.Item>

              {/* Password Strength Indicator */}
              {password && (
                <Form.Item>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Flex justify="space-between" align="center">
                      <Text type="secondary">Password Strength:</Text>
                      <Text strong style={{
                        color: passwordStrength.score <= 2 ? '#ff4d4f' :
                               passwordStrength.score === 3 ? '#faad14' : '#52c41a'
                      }}>
                        {getPasswordStrengthLabel(passwordStrength.score).label}
                      </Text>
                    </Flex>
                    <Progress
                      percent={(passwordStrength.score / 5) * 100}
                      strokeColor={
                        passwordStrength.score <= 2 ? '#ff4d4f' :
                        passwordStrength.score === 3 ? '#faad14' : '#52c41a'
                      }
                      showInfo={false}
                      size="small"
                    />
                    {passwordStrength.score < 4 && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {passwordStrength.feedback}
                      </Text>
                    )}
                  </Space>
                </Form.Item>
              )}

              {/* Password Requirements */}
              <Form.Item>
                <Alert
                  message="Password Requirements"
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
                      {PASSWORD_REQUIREMENTS.map((req, index) => {
                        let isMet = false
                        if (password) {
                          // Modern Unicode-aware checks
                          if (req.includes('8 characters')) isMet = password.length >= 8
                          else if (req.includes('3 different characters')) {
                            const uniqueChars = new Set(password).size
                            isMet = uniqueChars >= 3
                          }
                          // Other requirements are informational only (no validation)
                        }

                        return (
                          <Flex key={index} align="center" gap={8}>
                            {isMet ? (
                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            ) : (
                              <CloseCircleOutlined style={{ color: '#d9d9d9' }} />
                            )}
                            <Text
                              type={isMet ? 'success' : 'secondary'}
                              style={{ fontSize: '12px' }}
                            >
                              {req}
                            </Text>
                          </Flex>
                        )
                      })}
                    </Space>
                  }
                  type="info"
                  showIcon={false}
                  style={{ marginBottom: 16 }}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                rules={[
                  { required: true, message: "Please confirm your password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error("Passwords do not match"))
                    }
                  })
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: themeToken.colorTextSecondary }} />}
                  placeholder="Confirm new password"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                >
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          )}

          <Flex justify="center">
            <Link href="/login">Back to Login</Link>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  )
}
