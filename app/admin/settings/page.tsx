"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  Typography,
  Spin,
  Flex,
  Button,
  App,
  Input,
  InputNumber,
  Form,
  Divider,
  Space,
  Alert,
  Collapse,
  Switch,
  Slider,
  Row,
  Col,
  Tag,
  List,
} from "antd"
import {
  ControlOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  LineChartOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  DeleteOutlined,
  LinkOutlined,
} from "@ant-design/icons"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Text, Paragraph } = Typography

export default function SystemSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { message } = App.useApp()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  const [telegramForm] = Form.useForm()
  const [retentionForm] = Form.useForm()
  const [featuresForm] = Form.useForm()
  const [smtpForm] = Form.useForm()
  const [limitsForm] = Form.useForm()
  const [analyticsForm] = Form.useForm()

  // Redirect if session becomes invalid
  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") {
      router.push("/profile")
    }
  }, [session, status, router])

  // Load initial data only once on mount
  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") return
    if (!hasLoadedOnce) {
      loadSettings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hasLoadedOnce])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      // Load general settings
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        // Extract CSRF token from response header
        const token = res.headers.get("x-csrf-token")
        if (token) {
          setCsrfToken(token)
        }

        const data = await res.json()

        // Load each setting
        for (const setting of data.settings) {
          const value = setting.value as any

          switch (setting.key) {
            case "telegram_config":
              telegramForm.setFieldsValue({
                botToken: value.botToken || "",
                chatId: value.chatId || "",
                enabled: value.enabled === true, // Explicit boolean conversion
              })
              break

            case "log_retention":
              retentionForm.setFieldsValue({
                auditLogs: value.auditLogs || 90,
                sessionLogs: value.sessionLogs || 30,
                appLogs: value.appLogs || 30,
                rateLimitLogs: value.rateLimitLogs || 7,
              })
              break

            case "features":
              featuresForm.setFieldsValue({
                telegram_alerts: value.telegram_alerts === true,
                email_alerts: value.email_alerts === true,
              })
              break

            case "smtp_config":
              smtpForm.setFieldsValue({
                host: value.host || "",
                port: value.port || 587,
                secure: value.secure === true,
                auth: value.auth || "password",
                user: value.user || "",
                password: value.password || "",
                from: value.from || "noreply@example.com",
                enabled: value.enabled === true,
              })
              break

            case "system_limits":
              limitsForm.setFieldsValue({
                maxFileUploadMB: value.maxFileUploadMB || 5,
                maxAvatarSizeMB: value.maxAvatarSizeMB || 2,
                rateLimitPerMinute: value.rateLimitPerMinute || 60,
                maxLoginAttempts: value.maxLoginAttempts || 5,
                loginAttemptWindowMinutes: value.loginAttemptWindowMinutes || 15,
                maxPasswordResetAttempts: value.maxPasswordResetAttempts || 3,
                passwordResetWindowMinutes: value.passwordResetWindowMinutes || 60,
                maxPasswordChangeAttempts: value.maxPasswordChangeAttempts || 10,
                passwordChangeWindowMinutes: value.passwordChangeWindowMinutes || 60,
                max2FASetupAttempts: value.max2FASetupAttempts || 10,
                twoFASetupWindowMinutes: value.twoFASetupWindowMinutes || 15,
                max2FAVerifyAttempts: value.max2FAVerifyAttempts || 5,
                twoFAVerifyWindowMinutes: value.twoFAVerifyWindowMinutes || 15,
                maxEmailChangeAttempts: value.maxEmailChangeAttempts || 3,
                emailChangeWindowMinutes: value.emailChangeWindowMinutes || 1440,
                maxSignupAttempts: value.maxSignupAttempts || 3,
                signupWindowMinutes: value.signupWindowMinutes || 60,
                maxEmailVerificationAttempts: value.maxEmailVerificationAttempts || 5,
                emailVerificationWindowMinutes: value.emailVerificationWindowMinutes || 60,
                maxAdminWriteAttempts: value.maxAdminWriteAttempts || 30,
                adminWriteWindowMinutes: value.adminWriteWindowMinutes || 1,
                maxAdminReadAttempts: value.maxAdminReadAttempts || 100,
                adminReadWindowMinutes: value.adminReadWindowMinutes || 1,
                maxApiWriteAttempts: value.maxApiWriteAttempts || 30,
                apiWriteWindowMinutes: value.apiWriteWindowMinutes || 1,
                maxFileUploadAttempts: value.maxFileUploadAttempts || 10,
                fileUploadWindowMinutes: value.fileUploadWindowMinutes || 60,
                sessionTimeoutMinutes: value.sessionTimeoutMinutes || 60,
              })
              break
          }
        }
      }

      // Load analytics settings separately (different API endpoint)
      const analyticsRes = await fetch("/api/admin/analytics/settings")
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        analyticsForm.setFieldsValue({
          trackPageViews: analyticsData.trackPageViews === true,
          trackUserActivity: analyticsData.trackUserActivity === true,
          trackDeviceInfo: analyticsData.trackDeviceInfo === true,
          trackGeolocation: analyticsData.trackGeolocation === true,
          trackSubscriptionEvents: analyticsData.trackSubscriptionEvents === true,
          trackPerformance: analyticsData.trackPerformance === true,
          samplingRate: analyticsData.samplingRate || 100,
          batchSize: analyticsData.batchSize || 100,
          asyncTracking: analyticsData.asyncTracking === true,
          retainRawData: analyticsData.retainRawData || 90,
          retainAggregatedData: analyticsData.retainAggregatedData || 365,
          metabaseDashboards: analyticsData.metabaseDashboards || [],
        })
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
      message.error("Failed to load settings")
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }

  const saveTelegramConfig = async () => {
    try {
      const values = await telegramForm.validateFields()
      setIsSaving(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: "telegram_config",
          value: {
            botToken: values.botToken,
            chatId: values.chatId,
            enabled: values.enabled === true, // Explicitly convert to boolean
          },
          description: "Telegram bot configuration for alerts",
        }),
      })

      if (res.ok) {
        message.success("Telegram configuration saved successfully")
      } else {
        message.error("Failed to save configuration")
      }
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const testTelegramConfig = async () => {
    try {
      const values = await telegramForm.validateFields()
      setIsTesting(true)

      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/settings/telegram/test", {
        method: "POST",
        headers,
        body: JSON.stringify({
          botToken: values.botToken,
          chatId: values.chatId,
        }),
      })

      const data = await res.json()

      if (data.success) {
        message.success("Test message sent successfully! Check your Telegram.")
      } else {
        message.error(data.error || "Failed to send test message")
      }
    } catch (error) {
      message.error("Failed to test configuration")
    } finally {
      setIsTesting(false)
    }
  }

  const saveRetentionPolicy = async () => {
    try {
      const values = await retentionForm.validateFields()
      setIsSaving(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: "log_retention",
          value: values,
          description: "Log retention policy (days)",
        }),
      })

      if (res.ok) {
        message.success("Log retention policy saved")
      } else {
        message.error("Failed to save policy")
      }
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveFeatures = async () => {
    try {
      const values = await featuresForm.validateFields()
      setIsSaving(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: "features",
          value: {
            telegram_alerts: values.telegram_alerts === true,
            email_alerts: values.email_alerts === true,
          },
          description: "Feature flags",
        }),
      })

      if (res.ok) {
        message.success("Feature settings saved successfully")
      } else {
        message.error("Failed to save features")
      }
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveSMTPConfig = async () => {
    try {
      const values = await smtpForm.validateFields()
      setIsSaving(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: "smtp_config",
          value: {
            host: values.host,
            port: values.port,
            secure: values.secure === true,
            auth: values.auth || "password",
            user: values.user,
            password: values.password,
            from: values.from,
            enabled: values.enabled === true,
          },
          description: "SMTP/Email configuration for notifications",
        }),
      })

      if (res.ok) {
        message.success("SMTP configuration saved successfully")
      } else {
        const errorData = await res.json().catch(() => ({}))
        message.error(errorData.message || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const testSMTPConfig = async () => {
    try {
      setIsTesting(true)

      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/settings/smtp/test", {
        method: "POST",
        headers,
      })

      const data = await res.json()

      if (data.success) {
        message.success(data.message)
      } else {
        message.error(data.message || "Failed to test SMTP connection")
      }
    } catch (error) {
      console.error("SMTP test failed:", error)
      message.error("Failed to test SMTP connection")
    } finally {
      setIsTesting(false)
    }
  }

  const saveSystemLimits = async () => {
    try {
      const values = await limitsForm.validateFields()
      setIsSaving(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: "system_limits",
          value: {
            maxFileUploadMB: values.maxFileUploadMB,
            maxAvatarSizeMB: values.maxAvatarSizeMB,
            rateLimitPerMinute: values.rateLimitPerMinute,
            maxLoginAttempts: values.maxLoginAttempts,
            loginAttemptWindowMinutes: values.loginAttemptWindowMinutes,
            maxPasswordResetAttempts: values.maxPasswordResetAttempts,
            passwordResetWindowMinutes: values.passwordResetWindowMinutes,
            maxPasswordChangeAttempts: values.maxPasswordChangeAttempts,
            passwordChangeWindowMinutes: values.passwordChangeWindowMinutes,
            max2FASetupAttempts: values.max2FASetupAttempts,
            twoFASetupWindowMinutes: values.twoFASetupWindowMinutes,
            max2FAVerifyAttempts: values.max2FAVerifyAttempts,
            twoFAVerifyWindowMinutes: values.twoFAVerifyWindowMinutes,
            maxEmailChangeAttempts: values.maxEmailChangeAttempts,
            emailChangeWindowMinutes: values.emailChangeWindowMinutes,
            maxSignupAttempts: values.maxSignupAttempts,
            signupWindowMinutes: values.signupWindowMinutes,
            maxEmailVerificationAttempts: values.maxEmailVerificationAttempts,
            emailVerificationWindowMinutes: values.emailVerificationWindowMinutes,
            maxAdminWriteAttempts: values.maxAdminWriteAttempts,
            adminWriteWindowMinutes: values.adminWriteWindowMinutes,
            maxAdminReadAttempts: values.maxAdminReadAttempts,
            adminReadWindowMinutes: values.adminReadWindowMinutes,
            maxApiWriteAttempts: values.maxApiWriteAttempts,
            apiWriteWindowMinutes: values.apiWriteWindowMinutes,
            maxFileUploadAttempts: values.maxFileUploadAttempts,
            fileUploadWindowMinutes: values.fileUploadWindowMinutes,
            sessionTimeoutMinutes: values.sessionTimeoutMinutes,
          },
          description: "System-wide limits and thresholds",
        }),
      })

      if (res.ok) {
        message.success("System limits saved successfully")
      } else {
        message.error("Failed to save limits")
      }
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const saveAnalyticsSettings = async () => {
    try {
      const values = await analyticsForm.validateFields()
      setIsSaving(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/analytics/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          trackPageViews: values.trackPageViews === true,
          trackUserActivity: values.trackUserActivity === true,
          trackDeviceInfo: values.trackDeviceInfo === true,
          trackGeolocation: values.trackGeolocation === true,
          trackSubscriptionEvents: values.trackSubscriptionEvents === true,
          trackPerformance: values.trackPerformance === true,
          samplingRate: values.samplingRate,
          batchSize: values.batchSize,
          asyncTracking: values.asyncTracking === true,
          retainRawData: values.retainRawData,
          retainAggregatedData: values.retainAggregatedData,
          metabaseDashboards: values.metabaseDashboards || [],
        }),
      })

      if (res.ok) {
        message.success("Analytics settings saved successfully. Cache cleared.")
      } else {
        message.error("Failed to save analytics settings")
      }
    } catch (error) {
      console.error("Validation failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !session) {
    return (
      <SidebarLayout>
        <Flex align="center" justify="center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <Spin size="large" />
        </Flex>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <Flex vertical style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 16px", width: "100%" }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap="middle" style={{ marginBottom: 24 }}>
          <Flex vertical>
            <Flex align="center" gap="middle">
              <ControlOutlined style={{ fontSize: 32, color: "#1890ff" }} />
              <Title level={1} style={{ margin: 0 }}>System Settings</Title>
            </Flex>
            <Paragraph type="secondary">
              Configure system-wide settings and preferences
            </Paragraph>
          </Flex>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadSettings}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Flex>

        <Collapse
          defaultActiveKey={[]}
          size="large"
          items={[
            {
              key: "1",
              label: "🔔 Telegram Bot Configuration",
              children: (
                <>
            <Alert
              message="How to set up Telegram bot"
              description={
                <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
                  <li>Message @BotFather on Telegram</li>
                  <li>Send /newbot and follow instructions</li>
                  <li>Copy the bot token provided</li>
                  <li>Start a chat with your new bot</li>
                  <li>Get your chat ID from @userinfobot</li>
                </ol>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form form={telegramForm} layout="vertical">
              <Form.Item
                label="Bot Token"
                name="botToken"
                rules={[{ required: true, message: "Please enter bot token" }]}
              >
                <Input.Password placeholder="123456:ABC-DEF..." />
              </Form.Item>

              <Form.Item
                label="Chat ID"
                name="chatId"
                rules={[{ required: true, message: "Please enter chat ID" }]}
              >
                <Input placeholder="123456789" />
              </Form.Item>

              <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="enabled"
                  valuePropName="checked"
                  initialValue={false}
                  style={{ marginBottom: 0 }}
                >
                  <Switch />
                </Form.Item>
                <Text>Enable Telegram notifications</Text>
              </Flex>

              <Flex gap="small" wrap style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveTelegramConfig}
                  loading={isSaving}
                >
                  Save Configuration
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={testTelegramConfig}
                  loading={isTesting}
                >
                  Test Connection
                </Button>
              </Flex>
            </Form>
                </>
              ),
            },
            {
              key: "2",
              label: "📁 Log Retention Policy",
              children: (
                <>
            <Alert
              message="Automatic Cleanup"
              description="Logs older than the specified days will be automatically deleted by the cleanup cron job."
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form form={retentionForm} layout="vertical">
              <Form.Item
                label="Audit Logs (days)"
                name="auditLogs"
                rules={[{ required: true }]}
                tooltip="Admin action logs"
              >
                <InputNumber min={7} max={365} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Session Logs (days)"
                name="sessionLogs"
                rules={[{ required: true }]}
                tooltip="User login/logout logs"
              >
                <InputNumber min={7} max={180} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Application Logs (days)"
                name="appLogs"
                rules={[{ required: true }]}
                tooltip="General application logs (non-ERROR)"
              >
                <InputNumber min={7} max={90} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Rate Limit Logs (days)"
                name="rateLimitLogs"
                rules={[{ required: true }]}
                tooltip="Rate limiting logs"
              >
                <InputNumber min={1} max={30} style={{ width: "100%" }} />
              </Form.Item>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveRetentionPolicy}
                loading={isSaving}
              >
                Save Policy
              </Button>
            </Form>
                </>
              ),
            },
            {
              key: "3",
              label: "⚡ Feature Flags",
              children: (
                <>
            <Alert
              message="Geolocation Feature"
              description="IP geolocation is now on-demand to save API quota. Use the lookup button next to IP addresses in logs to fetch location data only when needed."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form form={featuresForm} layout="vertical">
              <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="telegram_alerts"
                  valuePropName="checked"
                  initialValue={false}
                  style={{ marginBottom: 0 }}
                >
                  <Switch />
                </Form.Item>
                <Flex vertical>
                  <Text strong>Telegram Alerts</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Send notifications via Telegram
                  </Text>
                </Flex>
              </Flex>

              <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="email_alerts"
                  valuePropName="checked"
                  initialValue={false}
                  style={{ marginBottom: 0 }}
                >
                  <Switch />
                </Form.Item>
                <Flex vertical>
                  <Text strong>Email Alerts</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Send notifications via email
                  </Text>
                </Flex>
              </Flex>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveFeatures}
                loading={isSaving}
              >
                Save Features
              </Button>
            </Form>
                </>
              ),
            },
            {
              key: "4",
              label: "📧 SMTP/Email Configuration",
              children: (
                <>
            <Alert
              message="Email Notification Setup"
              description="Configure SMTP server for sending email notifications and alerts."
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form form={smtpForm} layout="vertical">
              <Form.Item
                label="SMTP Host"
                name="host"
                rules={[{ required: true, message: "Please enter SMTP host" }]}
              >
                <Input placeholder="smtp.gmail.com" />
              </Form.Item>

              <Form.Item
                label="SMTP Port"
                name="port"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={65535} style={{ width: "100%" }} />
              </Form.Item>

              <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="secure"
                  valuePropName="checked"
                  initialValue={false}
                  style={{ marginBottom: 0 }}
                >
                  <Switch />
                </Form.Item>
                <Flex vertical>
                  <Text strong>Use TLS/SSL</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Enable secure connection (port 465)
                  </Text>
                </Flex>
              </Flex>

              <Form.Item
                label="Authentication Method"
                name="auth"
                rules={[{ required: true }]}
                tooltip="For MailHog and most SMTP servers, use 'password'"
              >
                <Input placeholder="password" />
              </Form.Item>

              <Form.Item
                label="Username"
                name="user"
                rules={[{ required: true, message: "Please enter username" }]}
              >
                <Input placeholder="your-email@gmail.com" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: "Please enter password" }]}
              >
                <Input.Password placeholder="App password or SMTP password" />
              </Form.Item>

              <Form.Item
                label="From Address"
                name="from"
                rules={[
                  { required: true, message: "Please enter from address" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input placeholder="noreply@example.com" />
              </Form.Item>

              <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="enabled"
                  valuePropName="checked"
                  initialValue={false}
                  style={{ marginBottom: 0 }}
                >
                  <Switch />
                </Form.Item>
                <Text>Enable email notifications</Text>
              </Flex>

              <Flex gap="small" wrap style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveSMTPConfig}
                  loading={isSaving}
                >
                  Save Configuration
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={testSMTPConfig}
                  loading={isTesting}
                >
                  Test Email Connection
                </Button>
              </Flex>
            </Form>
                </>
              ),
            },
            {
              key: "5",
              label: "⚙️ System Limits",
              children: (
                <>
            <Alert
              message="System-Wide Limits"
              description="Configure system-wide thresholds and limits for security and performance."
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form form={limitsForm} layout="vertical">
              <Form.Item
                label="Max File Upload Size (MB)"
                name="maxFileUploadMB"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum file upload size</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>Discord: 8 MB (free), 100 MB (Nitro)</li>
                        <li>Slack: 1 GB per file</li>
                        <li>Dropbox: 50 GB per file</li>
                        <li>Gmail: 25 MB attachments</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>5 MB</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Use case: General file uploads, documents</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={100} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Max Avatar Size (MB)"
                name="maxAvatarSizeMB"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum avatar/profile image size</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>Twitter: 2 MB</li>
                        <li>Facebook: 4 MB</li>
                        <li>LinkedIn: 8 MB</li>
                        <li>Discord: 8 MB</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>2 MB</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Note: Sufficient for high-quality profile images</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Rate Limit Per Minute"
                name="rateLimitPerMinute"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>General API rate limit per minute</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub API: 60/min (unauth), 5000/hour (auth)</li>
                        <li>Twitter API: 15-900/min (varies)</li>
                        <li>Stripe API: 100/sec</li>
                        <li>OpenAI API: 60/min</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>60 requests/min</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: API abuse, DoS attacks</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={10} max={1000} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">🔐 Login Rate Limiting</Divider>

              <Form.Item
                label="Max Login Attempts"
                name="maxLoginAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum failed login attempts before rate limiting</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 5 attempts</li>
                        <li>AWS: 5 attempts</li>
                        <li>Google: 6 attempts</li>
                        <li>Microsoft: 10 attempts</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>5 attempts</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: Brute-force password attacks</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={3} max={20} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Login Attempt Window (minutes)"
                name="loginAttemptWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for counting login attempts</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 15 minutes</li>
                        <li>AWS: 30 minutes</li>
                        <li>Microsoft: 30 minutes</li>
                        <li>Stripe: 60 minutes</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>15 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 5 attempts per 15 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={120} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">🔑 Password Reset Rate Limiting</Divider>

              <Form.Item
                label="Max Password Reset Attempts"
                name="maxPasswordResetAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum password reset requests (forgot password flow)</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 3 requests/hour</li>
                        <li>AWS: 5 requests/hour</li>
                        <li>Facebook: 3 requests/day</li>
                        <li>LinkedIn: 5 requests/hour</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>3 requests</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: Email spam, enumeration attacks</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={2} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Password Reset Window (minutes)"
                name="passwordResetWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for password reset requests</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 60 minutes</li>
                        <li>AWS: 60 minutes</li>
                        <li>Microsoft: 60 minutes</li>
                        <li>Facebook: 1440 minutes (24h)</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>60 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 3 requests per 60 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={15} max={180} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">🔐 Password Change Rate Limiting</Divider>

              <Form.Item
                label="Max Password Change Attempts"
                name="maxPasswordChangeAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum password changes (authenticated users)</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 10 changes/hour</li>
                        <li>Microsoft: 5 changes/hour</li>
                        <li>AWS: No limit (trusted user)</li>
                        <li>Google: 10 changes/day</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>10 changes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Note: Higher limit OK - user already authenticated</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={5} max={20} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Password Change Window (minutes)"
                name="passwordChangeWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for password changes</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 60 minutes</li>
                        <li>Microsoft: 60 minutes</li>
                        <li>Facebook: 60 minutes</li>
                        <li>LinkedIn: 60 minutes</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>60 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 10 changes per 60 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={15} max={180} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">🔐 2FA Setup Rate Limiting</Divider>

              <Form.Item
                label="Max 2FA Setup Attempts"
                name="max2FASetupAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum 2FA code verification attempts during setup</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 10 attempts</li>
                        <li>Google: 10 attempts</li>
                        <li>Microsoft: 10 attempts</li>
                        <li>AWS: 5 attempts</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>10 attempts</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Note: Higher limit allows for user mistakes during setup</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={5} max={20} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="2FA Setup Window (minutes)"
                name="twoFASetupWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for 2FA setup attempts</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 15 minutes</li>
                        <li>Google: 10 minutes</li>
                        <li>Microsoft: 15 minutes</li>
                        <li>AWS: 15 minutes</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>15 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 10 attempts per 15 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={5} max={60} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">🔐 2FA Login Verification Rate Limiting</Divider>

              <Form.Item
                label="Max 2FA Verify Attempts"
                name="max2FAVerifyAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum 2FA code attempts during login</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 5 attempts</li>
                        <li>Google: 5 attempts</li>
                        <li>AWS: 3 attempts</li>
                        <li>Dropbox: 10 attempts</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>5 attempts</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: TOTP brute-force (1M combinations)</div>
                      <div style={{ marginTop: 4, fontSize: 11, opacity: 0.9 }}>⚠️ Critical security: TOTP codes are 6 digits (000000-999999)</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={3} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="2FA Verify Window (minutes)"
                name="twoFAVerifyWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for 2FA verification attempts</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 15 minutes</li>
                        <li>Google: 10 minutes</li>
                        <li>AWS: 15 minutes</li>
                        <li>Microsoft: 30 minutes</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>15 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 5 attempts per 15 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={5} max={60} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">📧 Email Change Rate Limiting</Divider>

              <Form.Item
                label="Max Email Change Attempts"
                name="maxEmailChangeAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum email change requests</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 3 changes/day</li>
                        <li>Google: 3 changes/day</li>
                        <li>Facebook: 5 changes/week</li>
                        <li>LinkedIn: Unlimited (but monitored)</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>3 changes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: Account takeover attempts, abuse</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Email Change Window (minutes)"
                name="emailChangeWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for email change attempts</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 1440 min (24 hours)</li>
                        <li>Google: 1440 min (24 hours)</li>
                        <li>Facebook: 10080 min (7 days)</li>
                        <li>Microsoft: 1440 min (24 hours)</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>1440 minutes</strong> (24 hours, default)</div>
                      <div style={{ marginTop: 4 }}>Example: 3 changes per 24 hours</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={60} max={10080} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">📝 Signup Rate Limiting</Divider>

              <Form.Item
                label="Max Signup Attempts"
                name="maxSignupAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum new account registrations</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 3 signups/hour (per IP)</li>
                        <li>Discord: 5 signups/hour</li>
                        <li>Reddit: 3 signups/day</li>
                        <li>Twitter: 10 signups/day</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>3 signups</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: Bot registration, spam accounts</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Signup Window (minutes)"
                name="signupWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for signup attempts</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 60 minutes</li>
                        <li>Auth0: 60 minutes</li>
                        <li>Clerk: 60 minutes</li>
                        <li>Supabase: 60 minutes</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>60 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 3 signups per 60 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={15} max={180} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">✉️ Email Verification Rate Limiting</Divider>

              <Form.Item
                label="Max Email Verification Attempts"
                name="maxEmailVerificationAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum email verification link clicks</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 5 attempts/hour</li>
                        <li>AWS: 3 attempts/hour</li>
                        <li>Vercel: 10 attempts/hour</li>
                        <li>Discord: 5 attempts/hour</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>5 attempts</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: Token brute-force, verification spam</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={3} max={20} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Email Verification Window (minutes)"
                name="emailVerificationWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for email verification attempts</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>GitHub: 60 minutes</li>
                        <li>AWS: 60 minutes</li>
                        <li>Netlify: 60 minutes</li>
                        <li>Auth0: 60 minutes</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>60 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 5 attempts per 60 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={15} max={180} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">👨‍💼 Admin API Rate Limiting</Divider>

              <Form.Item
                label="Max Admin Write Attempts"
                name="maxAdminWriteAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Admin write operations (create/update/delete)</strong></div>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>30/minute</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Use case: Admin panel operations</div>
                      <div style={{ marginTop: 4 }}>Note: Higher than user limits - admins need flexibility</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={10} max={100} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Admin Write Window (minutes)"
                name="adminWriteWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for admin write operations</strong></div>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>1 minute</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 30 operations per 1 minute</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Max Admin Read Attempts"
                name="maxAdminReadAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Admin read operations (view/list/search)</strong></div>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>100/minute</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Use case: Viewing logs, user lists, dashboards</div>
                      <div style={{ marginTop: 4 }}>Note: Higher limit - reads are non-destructive</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={30} max={200} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="Admin Read Window (minutes)"
                name="adminReadWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for admin read operations</strong></div>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>1 minute</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 100 operations per 1 minute</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">🔌 API Write Rate Limiting</Divider>

              <Form.Item
                label="Max API Write Attempts"
                name="maxApiWriteAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>API write operations (POST/PUT/PATCH/DELETE)</strong></div>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>30/minute</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Use case: Regular users making API calls</div>
                      <div style={{ marginTop: 4 }}>Prevents: API abuse, spam, DoS attacks</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={10} max={100} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="API Write Window (minutes)"
                name="apiWriteWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for API write operations</strong></div>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>1 minute</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 30 operations per 1 minute</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">📤 File Upload Rate Limiting</Divider>

              <Form.Item
                label="Max File Upload Attempts"
                name="maxFileUploadAttempts"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Maximum file upload requests</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>Discord: 10 uploads/hour</li>
                        <li>Dropbox: 150 uploads/hour</li>
                        <li>Google Drive: Unlimited (but throttled)</li>
                        <li>Slack: 20 uploads/hour</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>10 uploads</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Prevents: Storage abuse, spam uploads</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={5} max={50} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label="File Upload Window (minutes)"
                name="fileUploadWindowMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>Time window for file uploads</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>Discord: 60 minutes</li>
                        <li>Slack: 60 minutes</li>
                        <li>GitHub: 60 minutes</li>
                        <li>Imgur: 60 minutes</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>60 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Example: 10 uploads per 60 minutes</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={15} max={180} style={{ width: "100%" }} />
              </Form.Item>

              <Divider orientation="left">⏱️ Session Configuration</Divider>

              <Form.Item
                label="Session Timeout (minutes)"
                name="sessionTimeoutMinutes"
                rules={[{ required: true }]}
                tooltip={{
                  title: (
                    <div>
                      <div><strong>User session expiry time</strong></div>
                      <div style={{ marginTop: 4 }}>Industry Standards:</div>
                      <ul style={{ paddingLeft: 16, marginBottom: 0 }}>
                        <li>Banking: 5-15 minutes (high security)</li>
                        <li>GitHub: 14 days (remember me)</li>
                        <li>Google: 30 days (web), 60 min (mobile)</li>
                        <li>AWS Console: 60 minutes</li>
                        <li>Facebook: 90 days</li>
                      </ul>
                      <div style={{ marginTop: 4 }}>Recommended: <strong>60 minutes</strong> (default)</div>
                      <div style={{ marginTop: 4 }}>Balance: Security vs user convenience</div>
                    </div>
                  ),
                }}
              >
                <InputNumber min={15} max={1440} style={{ width: "100%" }} />
              </Form.Item>

              <Alert
                message="Global Rate Limiting (DDoS Protection)"
                description={
                  <>
                    <div><strong>Hardcoded: 60 requests/minute per IP</strong></div>
                    <div style={{ marginTop: 8 }}>Protects ALL requests (pages, API calls) from DDoS attacks and page refresh spam.</div>
                    <div style={{ marginTop: 4 }}>Uses in-memory tracking (resets on deployment). Static assets excluded.</div>
                    <div style={{ marginTop: 4, opacity: 0.9 }}>To change limits, edit middleware.ts line 121</div>
                  </>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveSystemLimits}
                loading={isSaving}
              >
                Save Limits
              </Button>
            </Form>
                </>
              ),
            },
            {
              key: "6",
              label: (
                <Flex align="center" gap={8}>
                  <LineChartOutlined />
                  <span>Analytics Settings</span>
                </Flex>
              ),
              children: (
                <>
            <Alert
              message="Analytics Tracking Configuration"
              description="Configure what analytics data to track and how long to retain it. All tracking is optional and performance-optimized with async processing."
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Form form={analyticsForm} layout="vertical">
              {/* Tracking Features */}
              <Divider orientation="left">📊 Tracking Features</Divider>
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Enable or disable specific types of analytics tracking. Disabling features reduces database usage.
              </Paragraph>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Flex gap="small" align="center">
                    <Form.Item
                      name="trackPageViews"
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Flex vertical>
                      <Text strong>Track Page Views</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Record when users visit different pages
                      </Text>
                    </Flex>
                  </Flex>
                </Col>

                <Col xs={24} md={12}>
                  <Flex gap="small" align="center">
                    <Form.Item
                      name="trackUserActivity"
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Flex vertical>
                      <Text strong>Track User Activity</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Log user actions and interactions
                      </Text>
                    </Flex>
                  </Flex>
                </Col>

                <Col xs={24} md={12}>
                  <Flex gap="small" align="center">
                    <Form.Item
                      name="trackDeviceInfo"
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Flex vertical>
                      <Text strong>Track Device Info</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Detect browser, device type, and OS
                      </Text>
                    </Flex>
                  </Flex>
                </Col>

                <Col xs={24} md={12}>
                  <Flex gap="small" align="center">
                    <Form.Item
                      name="trackGeolocation"
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Flex vertical>
                      <Text strong>Track Geolocation</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Record user country and city (IP-based)
                      </Text>
                    </Flex>
                  </Flex>
                </Col>

                <Col xs={24} md={12}>
                  <Flex gap="small" align="center">
                    <Form.Item
                      name="trackSubscriptionEvents"
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Flex vertical>
                      <Text strong>Track Subscription Events</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Log payment events and plan changes
                      </Text>
                    </Flex>
                  </Flex>
                </Col>

                <Col xs={24} md={12}>
                  <Flex gap="small" align="center">
                    <Form.Item
                      name="trackPerformance"
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                    <Flex vertical>
                      <Flex gap={8} align="center">
                        <Text strong>Track Performance</Text>
                        <Tag color="warning" icon={<WarningOutlined />} style={{ fontSize: 10 }}>
                          Performance Impact
                        </Tag>
                      </Flex>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Measure API response times (more expensive)
                      </Text>
                    </Flex>
                  </Flex>
                </Col>
              </Row>

              {/* Performance Settings */}
              <Divider orientation="left">
                <Flex align="center" gap={8}>
                  <ThunderboltOutlined />
                  <span>Performance Settings</span>
                </Flex>
              </Divider>

              <Form.Item
                label={
                  <Flex justify="space-between" style={{ width: "100%" }}>
                    <Text strong>Sampling Rate</Text>
                    <Text type="secondary">
                      {analyticsForm.getFieldValue("samplingRate") || 100}%
                    </Text>
                  </Flex>
                }
                name="samplingRate"
              >
                <Slider
                  min={1}
                  max={100}
                  marks={{ 1: "1%", 25: "25%", 50: "50%", 75: "75%", 100: "100%" }}
                />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -16, marginBottom: 16 }}>
                Track {analyticsForm.getFieldValue("samplingRate") || 100}% of events. Lower values reduce database load.
              </Text>

              <Form.Item label={<Text strong>Batch Size</Text>} name="batchSize">
                <InputNumber
                  min={1}
                  max={1000}
                  style={{ width: "100%" }}
                  placeholder="100"
                />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -16, marginBottom: 16 }}>
                Number of events to batch before inserting (for future batch optimization).
              </Text>

              <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="asyncTracking"
                  valuePropName="checked"
                  initialValue={true}
                  style={{ marginBottom: 0 }}
                >
                  <Switch />
                </Form.Item>
                <Flex vertical>
                  <Flex gap={8} align="center">
                    <Text strong>Async Tracking</Text>
                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 10 }}>
                      Recommended
                    </Tag>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Track events in the background without slowing down API responses
                  </Text>
                </Flex>
              </Flex>

              {/* Data Retention */}
              <Divider orientation="left">
                <Flex align="center" gap={8}>
                  <DatabaseOutlined />
                  <span>Data Retention</span>
                </Flex>
              </Divider>
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Configure how long to keep raw activity logs and aggregated summaries.
              </Paragraph>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Text strong>Raw Data Retention (Days)</Text>}
                    name="retainRawData"
                  >
                    <InputNumber
                      min={1}
                      max={365}
                      style={{ width: "100%" }}
                      placeholder="90"
                    />
                  </Form.Item>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -16 }}>
                    Detailed activity logs. Default: 90 days. Automatically cleaned up daily.
                  </Text>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Text strong>Aggregated Data Retention (Days)</Text>}
                    name="retainAggregatedData"
                  >
                    <InputNumber
                      min={1}
                      max={3650}
                      style={{ width: "100%" }}
                      placeholder="365"
                    />
                  </Form.Item>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: -16 }}>
                    Daily/hourly summaries (much smaller). Default: 365 days.
                  </Text>
                </Col>
              </Row>

              <Alert
                type="info"
                showIcon
                message="How Analytics Works"
                description="Raw data is automatically compressed into daily/hourly summaries by cron jobs. This allows long-term trend analysis while saving database space."
                style={{ marginTop: 16, marginBottom: 16 }}
              />

              {/* Metabase Dashboards */}
              <Divider orientation="left">
                <Flex align="center" gap={8}>
                  <LinkOutlined />
                  <span>Metabase Dashboards</span>
                </Flex>
              </Divider>
              <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Add links to your Metabase dashboards. These will appear as buttons on the Analytics page.
              </Paragraph>

              <Form.List name="metabaseDashboards">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Card
                        key={field.key}
                        size="small"
                        style={{ marginBottom: 16 }}
                        extra={
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          >
                            Remove
                          </Button>
                        }
                      >
                        <Form.Item
                          {...field}
                          label={<Text strong>Dashboard Title</Text>}
                          name={[field.name, "title"]}
                          rules={[{ required: true, message: "Please enter dashboard title" }]}
                        >
                          <Input placeholder="e.g., User Analytics Dashboard" />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          label={<Text strong>Description</Text>}
                          name={[field.name, "description"]}
                        >
                          <Input.TextArea
                            rows={2}
                            placeholder="e.g., View user growth, engagement metrics, and retention analysis"
                          />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          label={<Text strong>Metabase URL</Text>}
                          name={[field.name, "url"]}
                          rules={[
                            { required: true, message: "Please enter URL" },
                            { type: "url", message: "Please enter a valid URL" },
                          ]}
                        >
                          <Input
                            prefix={<LinkOutlined />}
                            placeholder="https://metabase.yourdomain.com/dashboard/123"
                          />
                        </Form.Item>
                      </Card>
                    ))}

                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                    >
                      Add Dashboard Link
                    </Button>
                  </>
                )}
              </Form.List>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={saveAnalyticsSettings}
                loading={isSaving}
              >
                Save Analytics Settings
              </Button>
            </Form>
                </>
              ),
            },
          ]}
        />
      </Flex>
    </SidebarLayout>
  )
}
