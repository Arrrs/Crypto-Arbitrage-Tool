"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import {
  Card,
  Button,
  Alert,
  Modal,
  Form,
  Input,
  Typography,
  Space,
  Divider,
  Tag,
  Flex,
  App,
  List,
  theme as antdTheme,
} from "antd"
import {
  SafetyOutlined,
  LockOutlined,
  QrcodeOutlined,
  KeyOutlined,
} from "@ant-design/icons"
import Image from "next/image"
import TwoFactorVerifyModal from "./two-factor-verify-modal"

const { Title, Text, Paragraph } = Typography

interface TwoFactorSettingsProps {
  hasPassword: boolean
  csrfToken?: string | null
}

export interface TwoFactorSettingsRef {
  refresh: () => Promise<void>
}

const TwoFactorSettings = forwardRef<TwoFactorSettingsRef, TwoFactorSettingsProps>(
  ({ hasPassword, csrfToken }, ref) => {
  const { message } = App.useApp()
  const { token } = antdTheme.useToken()
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [backupCodesCount, setBackupCodesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [setupModalOpen, setSetupModalOpen] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [setupStep, setSetupStep] = useState(1) // 1: QR, 2: Verify, 3: Backup codes
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [disablePasswordModalOpen, setDisablePasswordModalOpen] = useState(false)
  const [disable2FAModalOpen, setDisable2FAModalOpen] = useState(false)

  const [verifyForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/user/profile")
      const data = await res.json()
      if (data.user) {
        setIs2FAEnabled(data.user.twoFactorEnabled || false)
        setBackupCodesCount(data.user.backupCodesCount || 0)
      }
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error)
    } finally {
      setLoading(false)
    }
  }

  // Expose refresh function to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchStatus,
  }))

  const handleSetup2FA = async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/user/2fa/setup", {
        method: "POST",
        headers,
      })

      const data = await res.json()

      if (!res.ok) {
        message.error(data.error || "Failed to setup 2FA")
        return
      }

      setQrCodeUrl(data.qrCodeUrl)
      setSecretKey(data.secret || "")
      setBackupCodes(data.backupCodes)
      setSetupModalOpen(true)
      setSetupStep(1)
    } catch (error) {
      message.error("Failed to setup 2FA")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async (values: { token: string }) => {
    setVerifyLoading(true)
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/user/2fa/verify", {
        method: "POST",
        headers,
        body: JSON.stringify({ token: values.token }),
      })

      const data = await res.json()

      if (!res.ok) {
        message.error(data.error || "Invalid code")
        setVerifyLoading(false)
        return
      }

      message.success("2FA enabled successfully!")
      setSetupStep(3) // Show backup codes
      setIs2FAEnabled(true)
      setBackupCodesCount(backupCodes.length) // Update backup codes count
      verifyForm.resetFields()
    } catch (error) {
      message.error("Failed to verify 2FA")
    } finally {
      setVerifyLoading(false)
    }
  }

  // Handle disable 2FA with password (for password users)
  const handleDisableWithPassword = async (values: { password: string }) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/user/2fa/disable", {
        method: "POST",
        headers,
        body: JSON.stringify({
          password: values.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        message.error(data.error || "Failed to disable 2FA")
        return
      }

      message.success("2FA disabled successfully")
      setIs2FAEnabled(false)
      setBackupCodesCount(0)
      setDisablePasswordModalOpen(false)
      passwordForm.resetFields()
    } catch (error) {
      message.error("Failed to disable 2FA")
    }
  }

  // Handle disable 2FA with 2FA code (for OAuth users)
  const handleDisableWith2FA = async (code: string) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/user/2fa/disable", {
        method: "POST",
        headers,
        body: JSON.stringify({
          twoFactorCode: code,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to disable 2FA")
      }

      message.success("2FA disabled successfully")
      setIs2FAEnabled(false)
      setBackupCodesCount(0)
      setDisable2FAModalOpen(false)
    } catch (error: any) {
      throw error // Re-throw to let TwoFactorVerifyModal handle the error display
    }
  }

  const handleRegenerateBackupCodes = async () => {
    try {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/user/2fa/regenerate-backup-codes", {
        method: "POST",
        headers,
      })

      const data = await res.json()

      if (!res.ok) {
        message.error(data.error || "Failed to regenerate backup codes")
        return
      }

      setBackupCodes(data.backupCodes)
      setBackupCodesCount(data.backupCodes.length) // Update the count
      setSetupStep(3)
      setSetupModalOpen(true)
      message.success("New backup codes generated")
    } catch (error) {
      message.error("Failed to regenerate backup codes")
    }
  }

  const copyBackupCodes = () => {
    const text = backupCodes.join("\n")
    navigator.clipboard.writeText(text)
    message.success("Backup codes copied to clipboard")
  }

  const downloadBackupCodes = () => {
    const text = backupCodes.join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "2fa-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
    message.success("Backup codes downloaded")
  }

  const closeSetupModal = () => {
    setSetupModalOpen(false)
    setSetupStep(1)
    verifyForm.resetFields()
  }

  // Removed password requirement - OAuth users can now enable 2FA

  return (
    <>
      <Card
        title={
          <Flex align="center" gap={8}>
            <SafetyOutlined />
            <span>Two-Factor Authentication</span>
          </Flex>
        }
        loading={loading}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
            <Flex vertical gap="small">
              <Flex gap="small" align="center">
                <Text strong>Status:</Text>
                {is2FAEnabled ? (
                  <Tag color="success" icon={<SafetyOutlined />}>
                    Enabled
                  </Tag>
                ) : (
                  <Tag color="default">Disabled</Tag>
                )}
              </Flex>
              {is2FAEnabled && (
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  <KeyOutlined /> {backupCodesCount} backup code{backupCodesCount !== 1 ? 's' : ''} remaining
                  {backupCodesCount < 3 && backupCodesCount > 0 && (
                    <Text type="warning"> (Low - consider regenerating)</Text>
                  )}
                  {backupCodesCount === 0 && (
                    <Text type="danger"> (No codes - regenerate immediately!)</Text>
                  )}
                </Text>
              )}
            </Flex>

            {is2FAEnabled ? (
              <Flex gap="small" wrap="wrap">
                <Button onClick={handleRegenerateBackupCodes}>
                  Regenerate Backup Codes
                </Button>
                <Button
                  danger
                  onClick={() => {
                    if (hasPassword) {
                      setDisablePasswordModalOpen(true)
                    } else {
                      setDisable2FAModalOpen(true)
                    }
                  }}
                >
                  Disable 2FA
                </Button>
              </Flex>
            ) : (
              <Button type="primary" onClick={handleSetup2FA}>
                Enable 2FA
              </Button>
            )}
          </Flex>

          <Alert
            message="What is 2FA?"
            description={hasPassword
              ? "Two-factor authentication adds an extra layer of security. When enabled, you'll need to enter a code from your authenticator app when signing in with your password."
              : "Two-factor authentication adds an extra layer of security. It protects sensitive account operations like changing your email or adding a password, even though you sign in with OAuth."}
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* Setup Modal */}
      <Modal
        title={<Flex align="center" gap={8}><SafetyOutlined /> Set up Two-Factor Authentication</Flex>}
        open={setupModalOpen}
        onCancel={closeSetupModal}
        footer={null}
        width={600}
      >
        {setupStep === 1 && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Alert
              message="Step 1: Scan QR Code"
              description="Use an authenticator app (Google Authenticator, Authy, 1Password, etc.) to scan this QR code."
              type="info"
            />

            <Flex justify="center">
              {qrCodeUrl && (
                <Image
                  src={qrCodeUrl}
                  alt="2FA QR Code"
                  width={250}
                  height={250}
                />
              )}
            </Flex>

            <Divider>Or enter manually</Divider>

            <Alert
              message="Can't scan the QR code?"
              description="Enter this key manually in your authenticator app:"
              type="info"
              showIcon
            />

            <Flex vertical gap={8}>
              <Flex
                justify="center"
                align="center"
                style={{
                  padding: "16px",
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: token.borderRadius,
                  fontSize: "16px",
                  fontFamily: "monospace",
                  letterSpacing: "2px",
                  wordBreak: "break-all",
                  textAlign: "center",
                }}
              >
                <Text code style={{ fontSize: "16px" }}>
                  {secretKey.match(/.{1,4}/g)?.join(" ") || secretKey}
                </Text>
              </Flex>

              <Button
                block
                onClick={() => {
                  navigator.clipboard.writeText(secretKey)
                  message.success("Setup key copied to clipboard")
                }}
                icon={<KeyOutlined />}
              >
                Copy Setup Key
              </Button>
            </Flex>

            <Button type="primary" block onClick={() => setSetupStep(2)}>
              Next: Verify Code
            </Button>
          </Space>
        )}

        {setupStep === 2 && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Alert
              message="Step 2: Verify Code"
              description="Enter the 6-digit code from your authenticator app to complete setup."
              type="info"
            />

            <Form form={verifyForm} onFinish={handleVerify2FA} layout="vertical">
              <Form.Item
                name="token"
                label="6-Digit Code"
                rules={[
                  { required: true, message: "Please enter the code" },
                  { len: 6, message: "Code must be exactly 6 digits" },
                ]}
              >
                <Input
                  prefix={<LockOutlined />}
                  placeholder="000000"
                  maxLength={6}
                  size="large"
                  style={{ fontSize: "24px", letterSpacing: "8px", textAlign: "center" }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Flex gap={8}>
                  <Button onClick={() => setSetupStep(1)}>Back</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={verifyLoading}
                    style={{ flex: 1 }}
                  >
                    Verify & Enable 2FA
                  </Button>
                </Flex>
              </Form.Item>
            </Form>
          </Space>
        )}

        {setupStep === 3 && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Alert
              message="Backup Codes"
              description="Save these backup codes in a secure place. Each code can only be used once if you lose access to your authenticator app."
              type="warning"
              showIcon
            />

            <List
              bordered
              dataSource={backupCodes}
              renderItem={(code) => (
                <List.Item>
                  <Text code style={{ fontSize: "16px" }}>{code}</Text>
                </List.Item>
              )}
            />

            <Flex gap={8}>
              <Button onClick={copyBackupCodes} icon={<KeyOutlined />}>
                Copy Codes
              </Button>
              <Button onClick={downloadBackupCodes} icon={<KeyOutlined />}>
                Download Codes
              </Button>
            </Flex>

            <Button type="primary" block onClick={closeSetupModal}>
              Done
            </Button>
          </Space>
        )}
      </Modal>

      {/* Disable 2FA Modal for Password Users */}
      <Modal
        title="Disable Two-Factor Authentication"
        open={disablePasswordModalOpen}
        onCancel={() => {
          setDisablePasswordModalOpen(false)
          passwordForm.resetFields()
        }}
        footer={null}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Alert
            message="Are you sure?"
            description="Disabling 2FA will make your account less secure. You'll only need your password to sign in."
            type="warning"
            showIcon
          />

          <Form form={passwordForm} onFinish={handleDisableWithPassword} layout="vertical">
            <Form.Item
              name="password"
              label="Confirm your password to disable 2FA"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Flex gap={8}>
                <Button onClick={() => setDisablePasswordModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  danger
                  type="primary"
                  htmlType="submit"
                  style={{ flex: 1 }}
                >
                  Disable 2FA
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Space>
      </Modal>

      {/* Disable 2FA Modal for OAuth Users (uses TwoFactorVerifyModal) */}
      <TwoFactorVerifyModal
        open={disable2FAModalOpen}
        onCancel={() => setDisable2FAModalOpen(false)}
        onVerify={handleDisableWith2FA}
        title="Disable Two-Factor Authentication"
        description="Disabling 2FA will make your account less secure. You'll only need to sign in with OAuth. Please verify your 2FA code to proceed."
      />
    </>
  )
})

TwoFactorSettings.displayName = 'TwoFactorSettings'

export default TwoFactorSettings
