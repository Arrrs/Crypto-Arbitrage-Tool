"use client"

import { useState } from "react"
import { Modal, Form, Input, Button, Alert, Flex, Tabs } from "antd"
import { LockOutlined, SafetyOutlined } from "@ant-design/icons"

interface TwoFactorVerifyModalProps {
  open: boolean
  onCancel: () => void
  onVerify: (code: string) => Promise<void>
  title?: string
  description?: string
}

/**
 * Reusable 2FA verification modal for sensitive actions
 * Matches the UX of the login 2FA flow with tabs for TOTP and Backup Code
 */
export default function TwoFactorVerifyModal({
  open,
  onCancel,
  onVerify,
  title = "Two-Factor Authentication Required",
  description = "This action requires two-factor authentication. Please enter your authentication code to continue.",
}: TwoFactorVerifyModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("totp")

  const handleSubmit = async (values: { code: string }) => {
    setLoading(true)
    setError("")

    try {
      await onVerify(values.code)
      form.resetFields()
      setActiveTab("totp") // Reset to default tab
    } catch (err: any) {
      setError(err.message || "Invalid authentication code")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setError("")
    setActiveTab("totp") // Reset to default tab
    onCancel()
  }

  return (
    <Modal
      title={
        <Flex align="center" gap={8}>
          <SafetyOutlined />
          {title}
        </Flex>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      maskClosable={false}
      width={480}
    >
      <Alert
        message={description}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Tabs for TOTP and Backup Code */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key)
          setError("") // Clear errors when switching tabs
          form.resetFields() // Clear input when switching
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
        style={{ marginBottom: 16 }}
      />

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

      <Form form={form} onFinish={handleSubmit} layout="vertical">
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
            prefix={<LockOutlined />}
            placeholder={activeTab === "totp" ? "000000" : "XXXXX-XXXXX"}
            maxLength={activeTab === "totp" ? 6 : 11}
            size="large"
            autoFocus
            style={{
              fontSize: activeTab === "totp" ? "24px" : "18px",
              letterSpacing: activeTab === "totp" ? "8px" : "2px",
              textAlign: "center",
            }}
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
          <Flex gap={8}>
            <Button onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ flex: 1 }}
            >
              Verify
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  )
}
