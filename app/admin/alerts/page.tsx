"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  Table,
  Typography,
  Spin,
  Flex,
  Button,
  Switch,
  Tag,
  Modal,
  Input,
  message,
  Select,
  InputNumber,
  Form,
  Space,
  Divider,
  Alert,
  Timeline,
  Tooltip,
  Grid,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  BellOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
} from "@ant-design/icons"
import SidebarLayout from "@/components/sidebar-layout"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

const { useBreakpoint } = Grid

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

interface AlertChannel {
  id: string
  type: "TELEGRAM" | "EMAIL" | "WEBHOOK"
  config: any
  enabled: boolean
}

interface AlertTrigger {
  id: string
  triggered: string
  resolved: string | null
  message: string
  sent: boolean
}

interface AlertRule {
  id: string
  name: string
  description: string | null
  type: "SECURITY" | "ERROR" | "INFO" | "WARNING"
  condition: any
  enabled: boolean
  cooldown: number
  channels: AlertChannel[]
  triggers: AlertTrigger[]
  _count: {
    triggers: number
  }
}

export default function AlertsManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<AlertRule | null>(null)
  const [form] = Form.useForm()
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  const [telegramConfig, setTelegramConfig] = useState({
    botToken: "",
    chatId: "",
  })

  const [smtpConfig, setSMTPConfig] = useState({
    enabled: false,
    from: "",
  })

  const [emailRecipient, setEmailRecipient] = useState("")
  const [enableTelegram, setEnableTelegram] = useState(true)
  const [enableEmail, setEnableEmail] = useState(false)

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
    fetchAlerts()
    loadTelegramConfig()
    loadSMTPConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchAlerts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/alerts")
      const token = res.headers.get("x-csrf-token")
      if (token) {
        setCsrfToken(token)
      }
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
      message.error("Failed to load alerts")
    } finally {
      setIsLoading(false)
    }
  }

  const loadTelegramConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        const telegramSetting = data.settings.find((s: any) => s.key === "telegram_config")
        if (telegramSetting) {
          const config = telegramSetting.value as any
          setTelegramConfig({
            botToken: config.botToken || "",
            chatId: config.chatId || "",
          })
        }
      }
    } catch (error) {
      console.error("Failed to load Telegram config:", error)
    }
  }

  const loadSMTPConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        const smtpSetting = data.settings.find((s: any) => s.key === "smtp_config")
        if (smtpSetting) {
          const config = smtpSetting.value as any
          setSMTPConfig({
            enabled: config.enabled === true,
            from: config.from || "",
          })
        }
      }
    } catch (error) {
      console.error("Failed to load SMTP config:", error)
    }
  }

  const toggleAlert = async (alert: AlertRule) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch(`/api/admin/alerts/${alert.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ...alert,
          enabled: !alert.enabled,
        }),
      })

      if (res.ok) {
        message.success(`Alert ${!alert.enabled ? "enabled" : "disabled"}`)
        fetchAlerts()
      } else {
        message.error("Failed to update alert")
      }
    } catch (error) {
      message.error("Failed to update alert")
    }
  }

  const testAlert = async (alert: AlertRule) => {
    try {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch(`/api/admin/alerts/${alert.id}/test`, {
        method: "POST",
        headers,
      })

      if (res.ok) {
        message.success("Test notification sent! Check your Telegram and email.")
        // Refresh alerts to update trigger counter
        fetchAlerts()
      } else {
        message.error("Failed to send test notification")
      }
    } catch (error) {
      message.error("Failed to send test notification")
    }
  }

  const deleteAlert = async (alert: AlertRule) => {
    Modal.confirm({
      title: "Delete Alert",
      content: `Are you sure you want to delete "${alert.name}"?`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          const headers: Record<string, string> = {}
          if (csrfToken) {
            headers["x-csrf-token"] = csrfToken
          }

          const res = await fetch(`/api/admin/alerts/${alert.id}`, {
            method: "DELETE",
            headers,
          })

          if (res.ok) {
            message.success("Alert deleted")
            fetchAlerts()
          } else {
            message.error("Failed to delete alert")
          }
        } catch (error) {
          message.error("Failed to delete alert")
        }
      },
    })
  }

  const openCreateModal = () => {
    setSelectedAlert(null)
    setEmailRecipient("")
    setEnableTelegram(true)
    setEnableEmail(false)
    form.resetFields()
    form.setFieldsValue({
      type: "SECURITY",
      enabled: true,
      cooldown: 300,
      conditionType: "failed_logins",
      threshold: 5,
      timeWindow: 15,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (alert: AlertRule) => {
    setSelectedAlert(alert)
    const condition = alert.condition as any

    // Load Telegram channel status
    const telegramChannel = alert.channels.find((c) => c.type === "TELEGRAM")
    setEnableTelegram(telegramChannel ? telegramChannel.enabled : false)

    // Load email recipient if exists
    const emailChannel = alert.channels.find((c) => c.type === "EMAIL")
    if (emailChannel && emailChannel.config) {
      setEmailRecipient(emailChannel.config.email || "")
      setEnableEmail(emailChannel.enabled)
    } else {
      setEmailRecipient("")
      setEnableEmail(false)
    }

    form.setFieldsValue({
      name: alert.name,
      description: alert.description,
      type: alert.type,
      enabled: alert.enabled,
      cooldown: alert.cooldown,
      conditionType: condition.type,
      threshold: condition.threshold,
      timeWindow: condition.timeWindow,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      // Build channels array
      const channels = []

      // Add Telegram channel if enabled
      if (enableTelegram) {
        channels.push({
          type: "TELEGRAM",
          config: telegramConfig,
          enabled: true,
        })
      }

      // Add Email channel if enabled and recipient is provided
      if (enableEmail && emailRecipient && emailRecipient.trim()) {
        channels.push({
          type: "EMAIL",
          config: { email: emailRecipient.trim() },
          enabled: true,
        })
      }

      const alertData = {
        name: values.name,
        description: values.description,
        type: values.type,
        enabled: values.enabled,
        cooldown: values.cooldown,
        condition: {
          type: values.conditionType,
          threshold: values.threshold,
          timeWindow: values.timeWindow,
        },
        channels,
      }

      const url = selectedAlert
        ? `/api/admin/alerts/${selectedAlert.id}`
        : "/api/admin/alerts"
      const method = selectedAlert ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertData),
      })

      if (res.ok) {
        message.success(selectedAlert ? "Alert updated" : "Alert created")
        setIsModalOpen(false)
        fetchAlerts()
      } else {
        message.error("Failed to save alert")
      }
    } catch (error) {
      console.error("Validation failed:", error)
    }
  }

  const showHistory = (alert: AlertRule) => {
    setSelectedAlert(alert)
    setIsHistoryModalOpen(true)
  }

  const columns: ColumnsType<AlertRule> = [
    {
      title: "Alert Name",
      dataIndex: "name",
      key: "name",
      width: isMobile ? 130 : undefined,
      fixed: isMobile ? "left" : undefined,
      render: (name: string, record) => (
        <Flex vertical gap={4}>
          <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>
            {isMobile && name.length > 15 ? name.substring(0, 15) + "..." : name}
          </Text>
          {record.description && !isMobile && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: isMobile ? 90 : 120,
      render: (type: string) => (
        <Tag
          color={
            type === "SECURITY" ? "red" :
            type === "ERROR" ? "orange" :
            type === "WARNING" ? "gold" :
            "blue"
          }
          style={{ fontSize: isMobile ? 10 : 12 }}
        >
          {type}
        </Tag>
      ),
    },
    {
      title: "Condition",
      key: "condition",
      width: isMobile ? 140 : 200,
      render: (_, record) => {
        const cond = record.condition as any
        const text = cond.type === "failed_logins"
          ? `${cond.threshold} ${isMobile ? "fails" : "failed logins"} in ${cond.timeWindow} min`
          : cond.type === "error_spike"
          ? `${cond.threshold} errors in ${cond.timeWindow} min`
          : ""
        return (
          <Text style={{ fontSize: isMobile ? 11 : 12 }}>
            {text}
          </Text>
        )
      },
    },
    {
      title: "Status",
      dataIndex: "enabled",
      key: "enabled",
      width: isMobile ? 60 : 100,
      render: (enabled: boolean, record) => (
        <Switch
          checked={enabled}
          onChange={() => toggleAlert(record)}
          size={isMobile ? "small" : "default"}
          checkedChildren={isMobile ? "" : "ON"}
          unCheckedChildren={isMobile ? "" : "OFF"}
        />
      ),
    },
    {
      title: "Triggers",
      dataIndex: ["_count", "triggers"],
      key: "triggers",
      width: 100,
      responsive: ["lg"] as any,
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 80 : 220,
      render: (_, record) => (
        <Space size="small">
          {!isMobile && (
            <Tooltip title="Test">
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                size="small"
                onClick={() => testAlert(record)}
                disabled={!record.enabled}
              />
            </Tooltip>
          )}
          <Tooltip title={isMobile ? "Details" : "History"}>
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => showHistory(record)}
            />
          </Tooltip>
          {!isMobile && (
            <>
              <Tooltip title="Edit">
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => openEditModal(record)}
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => deleteAlert(record)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ]

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
      <Flex vertical style={{ maxWidth: "1600px", margin: "0 auto", padding: "32px 16px", width: "100%" }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap="middle" style={{ marginBottom: 24 }}>
          <Flex vertical>
            <Flex align="center" gap="middle">
              <BellOutlined style={{ fontSize: 32, color: "#1890ff" }} />
              <Title level={1} style={{ margin: 0 }}>Alert Rules</Title>
            </Flex>
            <Paragraph type="secondary">
              Configure alert conditions and notification channels
            </Paragraph>
          </Flex>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAlerts}
              loading={isLoading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              Create Alert
            </Button>
          </Space>
        </Flex>

        {!telegramConfig.botToken && (
          <Alert
            message="Telegram Not Configured"
            description="Please configure your Telegram bot in System Settings to receive alerts."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={() => router.push("/admin/settings")}>
                Go to Settings
              </Button>
            }
          />
        )}

        {isMobile ? (
          // Mobile: Card-based layout
          <Flex vertical gap="middle">
            {alerts.map((alert) => {
              const cond = alert.condition as any
              return (
                <Card key={alert.id} size="small">
                  <Flex vertical gap="small">
                    {/* Header with name and toggle */}
                    <Flex justify="space-between" align="start">
                      <Flex vertical gap={2} style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13 }}>
                          {alert.name}
                        </Text>
                        {alert.description && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {alert.description}
                          </Text>
                        )}
                      </Flex>
                      <Switch
                        checked={alert.enabled}
                        onChange={() => toggleAlert(alert)}
                        size="small"
                      />
                    </Flex>

                    {/* Type and Condition */}
                    <Flex gap="small" wrap align="center">
                      <Tag
                        color={
                          alert.type === "SECURITY" ? "red" :
                          alert.type === "ERROR" ? "orange" :
                          alert.type === "WARNING" ? "gold" :
                          "blue"
                        }
                        style={{ fontSize: 10 }}
                      >
                        {alert.type}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {cond.type === "failed_logins"
                          ? `${cond.threshold} fails in ${cond.timeWindow}min`
                          : cond.type === "error_spike"
                          ? `${cond.threshold} errors in ${cond.timeWindow}min`
                          : ""}
                      </Text>
                    </Flex>

                    {/* Channels */}
                    {alert.channels && alert.channels.length > 0 && (
                      <Flex gap="small" wrap align="center">
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          Channels:
                        </Text>
                        {alert.channels.map((channel) => (
                          <Tag key={channel.id} style={{ fontSize: 10 }}>
                            {channel.type}
                          </Tag>
                        ))}
                      </Flex>
                    )}

                    {/* Trigger Count */}
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Triggered: {alert._count?.triggers || 0} times
                    </Text>

                    {/* Action Buttons */}
                    <Flex gap="small" wrap>
                      <Tooltip title="Test Alert">
                        <Button
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          size="small"
                          onClick={() => testAlert(alert)}
                          disabled={!alert.enabled}
                          style={{ flex: 1 }}
                        >
                          Test
                        </Button>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <Button
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => openEditModal(alert)}
                          style={{ flex: 1 }}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                      <Tooltip title="History">
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          onClick={() => showHistory(alert)}
                          style={{ flex: 1 }}
                        >
                          History
                        </Button>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={() => deleteAlert(alert)}
                          style={{ flex: 0.5 }}
                        />
                      </Tooltip>
                    </Flex>
                  </Flex>
                </Card>
              )
            })}
          </Flex>
        ) : (
          // Desktop: Table layout
          <Card>
            <div style={{ overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={alerts}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 800 }}
              />
            </div>
          </Card>
        )}

        {/* Create/Edit Modal */}
        <Modal
          title={selectedAlert ? "Edit Alert" : "Create Alert"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={handleSave}
          width={isMobile ? "95%" : 600}
          styles={isMobile ? { body: { maxHeight: "70vh", overflowY: "auto" } } : undefined}
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              label="Alert Name"
              name="name"
              rules={[{ required: true, message: "Please enter alert name" }]}
            >
              <Input placeholder="e.g., Failed Login Attempts" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <TextArea rows={2} placeholder="Optional description" />
            </Form.Item>

            <Form.Item label="Type" name="type" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="SECURITY">Security</Select.Option>
                <Select.Option value="ERROR">Error</Select.Option>
                <Select.Option value="WARNING">Warning</Select.Option>
                <Select.Option value="INFO">Info</Select.Option>
              </Select>
            </Form.Item>

            <Divider>Condition</Divider>

            <Form.Item label="Condition Type" name="conditionType" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="failed_logins">Failed Logins</Select.Option>
                <Select.Option value="error_spike">Error Spike</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Threshold"
              name="threshold"
              rules={[{ required: true }]}
              tooltip="Number of events to trigger alert"
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="Time Window (minutes)"
              name="timeWindow"
              rules={[{ required: true }]}
              tooltip="Period to count events"
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="Cooldown (seconds)"
              name="cooldown"
              rules={[{ required: true }]}
              tooltip="Minimum time between alerts"
            >
              <InputNumber min={60} style={{ width: "100%" }} />
            </Form.Item>

            <Divider>Notification Channels</Divider>

            <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
              <Switch
                checked={enableTelegram}
                onChange={setEnableTelegram}
                disabled={!telegramConfig.botToken || !telegramConfig.chatId}
              />
              <Flex vertical style={{ flex: 1 }}>
                <Text strong>Telegram Notifications</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {telegramConfig.botToken && telegramConfig.chatId
                    ? "Telegram bot is configured. Enable to send alerts to Telegram."
                    : "Please configure Telegram bot in Settings first."}
                </Text>
              </Flex>
            </Flex>

            <Flex gap="small" align="center" style={{ marginBottom: 16 }}>
              <Switch
                checked={enableEmail}
                onChange={setEnableEmail}
                disabled={!smtpConfig.enabled}
              />
              <Flex vertical style={{ flex: 1 }}>
                <Text strong>Email Notifications</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {smtpConfig.enabled
                    ? `SMTP is configured. Emails will be sent from ${smtpConfig.from}`
                    : "Please configure SMTP settings first."}
                </Text>
              </Flex>
            </Flex>

            {enableEmail && smtpConfig.enabled && (
              <Form.Item
                label="Email Recipient"
                tooltip="Email address to receive alert notifications"
                rules={[{ required: true, type: "email", message: "Please enter a valid email" }]}
              >
                <Input
                  placeholder="admin@example.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  type="email"
                />
              </Form.Item>
            )}

            <Form.Item name="enabled" valuePropName="checked">
              <Flex gap="small" align="center">
                <Switch />
                <Text>Enable alert immediately</Text>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>

        {/* History Modal */}
        <Modal
          title={`Trigger History: ${selectedAlert?.name}`}
          open={isHistoryModalOpen}
          onCancel={() => setIsHistoryModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsHistoryModalOpen(false)}>
              Close
            </Button>,
          ]}
          width={700}
        >
          {selectedAlert && selectedAlert.triggers.length > 0 ? (
            <Timeline
              items={selectedAlert.triggers.map((trigger) => ({
                color: trigger.sent ? "green" : "orange",
                dot: trigger.sent ? <CheckCircleOutlined /> : <CloseCircleOutlined />,
                children: (
                  <Flex vertical gap="small">
                    <Flex justify="space-between">
                      <Text strong>{dayjs(trigger.triggered).format("MMM D, YYYY HH:mm:ss")}</Text>
                      <Tag color={trigger.sent ? "success" : "warning"}>
                        {trigger.sent ? "Sent" : "Pending"}
                      </Tag>
                    </Flex>
                    <Text>{trigger.message}</Text>
                    {trigger.resolved && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Resolved: {dayjs(trigger.resolved).format("MMM D, YYYY HH:mm:ss")}
                      </Text>
                    )}
                  </Flex>
                ),
              }))}
            />
          ) : (
            <Text type="secondary">No triggers yet</Text>
          )}
        </Modal>
      </Flex>
    </SidebarLayout>
  )
}
