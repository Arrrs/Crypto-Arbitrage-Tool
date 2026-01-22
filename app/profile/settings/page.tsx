"use client"

import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, Form, Input, Button, Alert, Tag, Spin, Typography, Space, Badge, Divider, Flex, Progress } from "antd"
import { UserOutlined, MailOutlined, LockOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons"
import SidebarLayout from "@/components/sidebar-layout"
import AvatarUpload from "@/components/avatar-upload"
import TwoFactorSettings, { TwoFactorSettingsRef } from "@/components/two-factor-settings"
import ActiveSessions from "@/components/active-sessions"
import TwoFactorVerifyModal from "@/components/two-factor-verify-modal"
import { checkPasswordStrength, getPasswordStrengthLabel } from "@/lib/validation"

const { Title, Paragraph, Text } = Typography

export default function ProfilePage() {
  const { data: session, update, status } = useSession()
  const router = useRouter()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [profileError, setProfileError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [hasPassword, setHasPassword] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const twoFactorSettingsRef = useRef<TwoFactorSettingsRef>(null)

  // Password strength state
  const [newPassword, setNewPassword] = useState("")
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" })

  // 2FA verification modal state
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'email' | 'password'
    values: any
  } | null>(null)

  // Redirect if session becomes null (separate effect to avoid infinite loops)
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
    }
  }, [session, status, router])

  // Load initial data only once on mount
  useEffect(() => {
    if (status === "loading") return
    if (!session) return

    profileForm.setFieldsValue({
      name: session.user.name || "",
      email: session.user.email || "",
    })

    // Check if user has a password and get avatar URL (fetch from API)
    // Only fetch once when component mounts
    fetch("/api/user/profile")
      .then((res) => {
        // Extract CSRF token from response header
        const token = res.headers.get("x-csrf-token")
        if (token) {
          setCsrfToken(token)
        }
        return res.json()
      })
      .then((data) => {
        if (data.user) {
          // OAuth users don't have passwords
          setHasPassword(data.user.hasPassword)
          setAvatarUrl(data.user.image)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch profile:", err)
        // If fetch fails, assume they have password
        setHasPassword(true)
      })
    // Only run once on mount when status becomes authenticated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const handleAvatarUpdate = async (imageUrl: string | null) => {
    setAvatarUrl(imageUrl)
    // Force session update to refetch from database
    await update({})
    // Also force a hard refresh
    window.location.reload()
  }

  const handleProfileUpdate = async (values: { name: string; email: string }, twoFactorCode?: string) => {
    setProfileError("")
    setProfileSuccess("")
    setIsProfileLoading(true)

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ...values,
          twoFactorCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if 2FA verification is required
        if (data.requiresTwoFactor) {
          // Store pending action and show 2FA modal
          setPendingAction({ type: 'email', values })
          setShow2FAModal(true)
          setIsProfileLoading(false)
          return
        }

        // Handle Zod validation errors (array of error objects)
        if (Array.isArray(data.error)) {
          const errorMessages = data.error.map((err: any) => err.message).join(", ")
          setProfileError(errorMessages)
        } else {
          setProfileError(data.error || "Failed to update profile")
        }
      } else {
        setProfileSuccess(data.message || "Profile updated successfully")

        // Trigger session update with new data to refresh the JWT token
        await update({
          name: values.name,
          email: values.email,
        })

        // Force router refresh to update UI
        router.refresh()
      }
    } catch (error) {
      setProfileError("An error occurred. Please try again.")
    } finally {
      setIsProfileLoading(false)
    }
  }

  const handlePasswordUpdate = async (values: {
    currentPassword?: string
    newPassword: string
  }, twoFactorCode?: string) => {
    setPasswordError("")
    setPasswordSuccess("")
    setIsPasswordLoading(true)

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const response = await fetch("/api/user/password", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...values,
          twoFactorCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if 2FA verification is required
        if (data.requiresTwoFactor) {
          // Store pending action and show 2FA modal
          setPendingAction({ type: 'password', values })
          setShow2FAModal(true)
          setIsPasswordLoading(false)
          return
        }

        // Handle Zod validation errors (array of error objects)
        if (Array.isArray(data.error)) {
          const errorMessages = data.error.map((err: any) => err.message).join(", ")
          setPasswordError(errorMessages)
        } else {
          setPasswordError(data.error || "Failed to update password")
        }
      } else {
        setPasswordSuccess(hasPassword ? "Password updated successfully" : "Password set successfully! You can now change your email address.")
        passwordForm.resetFields()
        // Clear password strength state
        setNewPassword("")
        setPasswordStrength({ score: 0, feedback: "" })
        // Update hasPassword state
        setHasPassword(true)
      }
    } catch (error) {
      setPasswordError("An error occurred. Please try again.")
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const handle2FAVerification = async (code: string) => {
    if (!pendingAction) return

    if (pendingAction.type === 'email') {
      await handleProfileUpdate(pendingAction.values, code)
      setShow2FAModal(false)
      setPendingAction(null)
      // Refresh 2FA settings to update backup codes count
      await twoFactorSettingsRef.current?.refresh()
    } else if (pendingAction.type === 'password') {
      await handlePasswordUpdate(pendingAction.values, code)
      setShow2FAModal(false)
      setPendingAction(null)
      // Refresh 2FA settings to update backup codes count
      await twoFactorSettingsRef.current?.refresh()
    }
  }

  if (status === "loading" || !session) {
    return (
      <SidebarLayout>
        <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <Spin size="large" />
        </Flex>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <Flex vertical style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px', width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Flex vertical>
            <Title level={1}>Profile Settings</Title>
            <Paragraph type="secondary">Manage your account settings and preferences</Paragraph>
          </Flex>

          <Card title="Profile Picture">
            <AvatarUpload
              currentImage={avatarUrl}
              onImageUpdate={handleAvatarUpdate}
              size={120}
              csrfToken={csrfToken}
            />
          </Card>

          <Card
            title={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>Account Information</span>
                <Tag color={session.user.role === "ADMIN" ? "green" : "blue"}>
                  {session.user.role}
                </Tag>
              </Space>
            }
          >
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileUpdate}
          >
            {!hasPassword && (
              <Alert
                message="No password set"
                description="You signed up with Google. You can change your email address at any time. Setting a password is optional and allows you to log in with email/password."
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
              />
            )}

            <Form.Item
              name="name"
              label="Name"
              rules={[
                { required: true, message: "Please input your name!" },
                { min: 2, message: "Name must be at least 2 characters!" },
              ]}
            >
              <Input prefix={<UserOutlined />} size="large" />
            </Form.Item>

            <Form.Item
              name="email"
              label={
                <Space>
                  Email
                  {session.user.emailVerified ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      Verified
                    </Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="warning">
                      Not Verified
                    </Tag>
                  )}
                </Space>
              }
              extra="Changing your email requires verification via a link sent to your new address"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input prefix={<MailOutlined />} size="large" />
            </Form.Item>

            {profileError && <Alert message={profileError} type="error" showIcon style={{ marginBottom: '16px' }} />}
            {profileSuccess && <Alert message={profileSuccess} type="success" showIcon style={{ marginBottom: '16px' }} />}

            <Button type="primary" htmlType="submit" loading={isProfileLoading} size="large">
              Update Profile
            </Button>
          </Form>
        </Card>

          {/* Two-Factor Authentication Settings */}
          <TwoFactorSettings ref={twoFactorSettingsRef} hasPassword={hasPassword} csrfToken={csrfToken} />

          {/* Active Sessions Management */}
          <ActiveSessions />

          <Card title={hasPassword ? "Change Password" : "Set Password"}>
          <Form form={passwordForm} layout="vertical" onFinish={handlePasswordUpdate}>
            {hasPassword ? (
              <Form.Item
                name="currentPassword"
                label="Current Password"
                rules={[
                  { required: true, message: "Please input your current password!" },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} size="large" />
              </Form.Item>
            ) : (
              <Alert
                message="You don't have a password yet"
                description="Set a password to enable email/password login. You can change your email address without setting a password."
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: "Please input your new password!" },
                {
                  validator: async (_, value) => {
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
                prefix={<LockOutlined />}
                size="large"
                onChange={(e) => {
                  const value = e.target.value
                  setNewPassword(value)
                  if (value) {
                    setPasswordStrength(checkPasswordStrength(value))
                  } else {
                    setPasswordStrength({ score: 0, feedback: "" })
                  }
                }}
              />
            </Form.Item>

            {/* Password Strength Indicator */}
            {newPassword && (
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

            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={["newPassword"]}
              rules={[
                { required: true, message: "Please confirm your new password!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("newPassword") === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error("The passwords do not match!"))
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} size="large" />
            </Form.Item>

            {passwordError && <Alert message={passwordError} type="error" showIcon style={{ marginBottom: '16px' }} />}
            {passwordSuccess && <Alert message={passwordSuccess} type="success" showIcon style={{ marginBottom: '16px' }} />}

            <Button type="primary" htmlType="submit" loading={isPasswordLoading} size="large">
              Update Password
            </Button>
          </Form>
        </Card>
        </Space>
      </Flex>

      {/* 2FA Verification Modal for Sensitive Actions */}
      <TwoFactorVerifyModal
        open={show2FAModal}
        onCancel={() => {
          setShow2FAModal(false)
          setPendingAction(null)
        }}
        onVerify={handle2FAVerification}
        title="Two-Factor Authentication Required"
        description={
          pendingAction?.type === 'email'
            ? "Changing your email address requires two-factor authentication. Please enter your authentication code to continue."
            : "Changing your password requires two-factor authentication. Please enter your authentication code to continue."
        }
      />
    </SidebarLayout>
  )
}
