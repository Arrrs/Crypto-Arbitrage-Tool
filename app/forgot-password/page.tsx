"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, Form, Input, Button, Alert, Typography, Flex } from "antd"
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Paragraph, Text } = Typography

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (values: { email: string }) => {
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
      } else {
        setError(data.error || "Failed to send reset email")
      }
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
          <Flex vertical gap="large">
            <Flex vertical>
              <Title level={2}>Forgot Password?</Title>
              <Paragraph type="secondary">
                Enter your email address and we'll send you a link to reset your password.
              </Paragraph>
            </Flex>

            {success ? (
              <Alert
                message="Check Your Email"
                description={success}
                type="success"
                showIcon
                action={
                  <Link href="/login">
                    <Button type="primary">Back to Login</Button>
                  </Link>
                }
              />
            ) : (
              <>
                <Form
                  name="forgot-password"
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
                      prefix={<MailOutlined />}
                      placeholder="Enter your email"
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
                      Send Reset Link
                    </Button>
                  </Form.Item>
                </Form>

                <Flex justify="center" gap="small">
                  <Link href="/login">
                    <Button type="link" icon={<ArrowLeftOutlined />}>
                      Back to Login
                    </Button>
                  </Link>
                </Flex>
              </>
            )}
          </Flex>
        </Card>
      </Flex>
    </SidebarLayout>
  )
}
