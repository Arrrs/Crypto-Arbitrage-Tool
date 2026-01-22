"use client"

import { useEffect, useState } from "react"
import {
  Card,
  List,
  Button,
  Typography,
  Space,
  Tag,
  Popconfirm,
  Empty,
  Spin,
  Flex,
  Divider,
  Alert,
} from "antd"
import {
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons"

const { Text, Title } = Typography

interface SessionData {
  id: string
  browser: string
  os: string
  deviceType: string
  ipAddress: string | null
  location: string | null  // Changed to nullable
  country: string | null
  city: string | null
  createdAt: string
  lastActive: string
  expires: string
  isCurrent: boolean
}

interface SessionsResponse {
  sessions: SessionData[]
  total: number
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      setError("")
      const response = await fetch("/api/user/sessions")

      if (!response.ok) {
        throw new Error("Failed to fetch sessions")
      }

      // Get CSRF token from response header
      const token = response.headers.get("x-csrf-token")
      if (token) {
        setCsrfToken(token)
      }

      const data: SessionsResponse = await response.json()
      setSessions(data.sessions)
    } catch (error) {
      setError("Failed to load active sessions")
      console.error("Failed to fetch sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId)
      setError("")
      setSuccess("")

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to revoke session")
      }

      setSuccess("Session revoked successfully")
      // Remove the revoked session from the list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to revoke session"
      )
      console.error("Failed to revoke session:", error)
    } finally {
      setRevoking(null)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <MobileOutlined style={{ fontSize: 24 }} />
      case "tablet":
        return <TabletOutlined style={{ fontSize: 24 }} />
      default:
        return <LaptopOutlined style={{ fontSize: 24 }} />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  if (loading) {
    return (
      <Card>
        <Flex justify="center" align="center" style={{ minHeight: 200 }}>
          <Spin size="large" />
        </Flex>
      </Card>
    )
  }

  return (
    <Card
      title={
        <Space>
          <GlobalOutlined />
          <span>Active Sessions</span>
          <Tag color="blue">{sessions.length}</Tag>
        </Space>
      }
      extra={
        <Button onClick={fetchSessions} size="small">
          Refresh
        </Button>
      }
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

      {success && (
        <Alert
          message={success}
          type="success"
          showIcon
          closable
          onClose={() => setSuccess("")}
          style={{ marginBottom: 16 }}
        />
      )}

      {sessions.length === 0 ? (
        <Empty description="No active sessions" />
      ) : (
        <>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            Manage all devices where you're currently signed in. You can revoke access
            to any device except your current session.
          </Text>

          <List
            dataSource={sessions}
            renderItem={(session) => (
              <List.Item
                key={session.id}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <Flex
                  style={{ width: "100%" }}
                  gap="middle"
                  align="center"
                  wrap="wrap"
                >
                  {/* Device Icon */}
                  <div style={{ flexShrink: 0, alignSelf: "flex-start" }}>
                    {getDeviceIcon(session.deviceType)}
                  </div>

                  {/* Session Info */}
                  <Flex
                    vertical
                    gap={8}
                    style={{ flex: 1, minWidth: 200 }}
                  >
                    {/* Browser and OS */}
                    <Flex align="center" gap="small" wrap="wrap">
                      <Text strong style={{ fontSize: 15 }}>
                        {session.browser} on {session.os}
                      </Text>
                      {session.isCurrent && (
                        <Tag
                          color="green"
                          icon={<CheckCircleOutlined />}
                          style={{ margin: 0 }}
                        >
                          Current Session
                        </Tag>
                      )}
                    </Flex>

                    {/* Location and IP - vertical on mobile for better readability */}
                    <Flex vertical gap={4}>
                      {session.location && session.location !== "Unknown" && (
                        <Space size="small">
                          <EnvironmentOutlined style={{ color: "#8c8c8c" }} />
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {session.location}
                          </Text>
                        </Space>
                      )}
                      {session.ipAddress && (
                        <Space size="small">
                          <GlobalOutlined style={{ color: "#8c8c8c" }} />
                          <Text type="secondary" style={{ fontSize: 13, wordBreak: "break-all" }}>
                            {session.ipAddress === "::1" ? "localhost (::1)" : session.ipAddress}
                          </Text>
                        </Space>
                      )}
                    </Flex>

                    {/* Timestamps - responsive wrapping */}
                    <Flex gap={8} wrap="wrap" align="center">
                      <Space size="small">
                        <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Last active: {formatDate(session.lastActive)}
                        </Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        •
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Signed in: {formatDate(session.createdAt)}
                      </Text>
                    </Flex>
                  </Flex>

                  {/* Revoke Button - responsive */}
                  <div style={{ flexShrink: 0 }}>
                    {session.isCurrent ? (
                      <Button disabled size="small">
                        Current Device
                      </Button>
                    ) : (
                      <Popconfirm
                        title="Revoke Session"
                        description="Are you sure you want to sign out this device?"
                        onConfirm={() => revokeSession(session.id)}
                        okText="Yes, revoke"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={revoking === session.id}
                        >
                          Revoke
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                </Flex>
              </List.Item>
            )}
          />

          <Divider />

          <Flex justify="space-between" align="center" wrap="wrap" gap="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Sessions expire after 30 days of inactivity
            </Text>
            <Popconfirm
              title="Revoke All Other Sessions"
              description={`This will sign you out on all other devices (${
                sessions.filter((s) => !s.isCurrent).length
              } sessions). Continue?`}
              onConfirm={async () => {
                const otherSessions = sessions.filter((s) => !s.isCurrent)
                for (const session of otherSessions) {
                  await revokeSession(session.id)
                }
              }}
              okText="Yes, revoke all"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              disabled={sessions.filter((s) => !s.isCurrent).length === 0}
            >
              <Button
                danger
                size="small"
                disabled={sessions.filter((s) => !s.isCurrent).length === 0}
              >
                Revoke All Other Sessions
              </Button>
            </Popconfirm>
          </Flex>
        </>
      )}
    </Card>
  )
}
