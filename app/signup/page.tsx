"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, Form, Input, Button, Alert, Typography, Space, Divider, Flex, Progress } from "antd"
import { UserOutlined, MailOutlined, LockOutlined, GoogleOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"
import { PASSWORD_REQUIREMENTS, checkPasswordStrength, getPasswordStrengthLabel } from "@/lib/validation"

const { Title, Paragraph, Text } = Typography

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" })

  const handleSubmit = async (values: {
    name: string
    email: string
    password: string
  }) => {
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Something went wrong")
        setIsLoading(false)
        return
      }

      // Show success message and redirect to login
      // User needs to verify email before signing in
      router.push("/login?message=Please check your email to verify your account before signing in.")
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarLayout>
      <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 64px)', padding: '16px' }}>
        <Card style={{ maxWidth: '450px', width: '100%' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Flex vertical>
              <Title level={2}>Sign Up</Title>
              <Paragraph type="secondary">Create a new account</Paragraph>
            </Flex>

            <Form
            name="signup"
            onFinish={handleSubmit}
            layout="vertical"
            autoComplete="off"
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[
                { required: true, message: "Please input your name!" },
                { min: 2, message: "Name must be at least 2 characters!" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your name"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Enter your email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please input your password!" },
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

                    // Check for at least 3 different characters
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
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                size="large"
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
                        // Check based on modern requirements
                        if (req.includes('8 characters')) {
                          isMet = password.length >= 8
                        } else if (req.includes('3 different characters')) {
                          const uniqueChars = new Set(password).size
                          isMet = uniqueChars >= 3
                        } else if (req.includes('any characters')) {
                          // Always show as met - we accept all Unicode
                          isMet = true
                        } else if (req.includes('common passwords')) {
                          // Check for obvious weak passwords
                          const weak = ['password', 'qwerty', '123456', 'Password123', 'Qwerty123']
                          isMet = !weak.some(w => password.toLowerCase().includes(w.toLowerCase()))
                        }
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
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your password!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(
                      new Error("The passwords do not match!")
                    )
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                size="large"
              />
            </Form.Item>

            {error && (
              <Form.Item>
                <Alert message={error} type="error" showIcon />
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
                Sign Up
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

            <Flex justify="center" align="center" gap={4}>
              <Text type="secondary">Already have an account?</Text>
              <Link href="/login" style={{ marginLeft: 4 }}>Login</Link>
            </Flex>
          </Space>
        </Card>
      </Flex>
    </SidebarLayout>
  )
}
