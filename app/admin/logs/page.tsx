"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  Table,
  Tag,
  Typography,
  Spin,
  Flex,
  Select,
  DatePicker,
  Button,
  Space,
  Descriptions,
  Modal,
  Tabs,
  Input,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  AuditOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  SearchOutlined,
  DownOutlined,
  DownloadOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons"
import SidebarLayout from "@/components/sidebar-layout"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

const { Title, Text, Paragraph } = Typography
const { RangePicker } = DatePicker

interface AuditLog {
  id: string
  adminId: string
  admin: {
    name: string
    email: string
  }
  action: string
  resource: string | null
  resourceId: string | null
  details: any
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

interface SessionLog {
  id: string
  userId: string
  user: {
    name: string
    email: string
  }
  event: string
  method: string | null
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  failReason: string | null
  timestamp: string
}

interface AppLog {
  id: string
  level: string
  message: string
  category: string
  metadata: any
  stack: string | null
  timestamp: string
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State for each log type
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([])
  const [appLogs, setAppLogs] = useState<AppLog[]>([])

  // Pagination cursors
  const [auditCursor, setAuditCursor] = useState<string | null>(null)
  const [sessionCursor, setSessionCursor] = useState<string | null>(null)
  const [appCursor, setAppCursor] = useState<string | null>(null)

  // Has more flags
  const [auditHasMore, setAuditHasMore] = useState(false)
  const [sessionHasMore, setSessionHasMore] = useState(false)
  const [appHasMore, setAppHasMore] = useState(false)

  // Search and filters
  const [auditSearch, setAuditSearch] = useState("")
  const [sessionSearch, setSessionSearch] = useState("")
  const [appSearch, setAppSearch] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [auditLoading, setAuditLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [appLoading, setAppLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState("audit")
  const [lookingUpGeo, setLookingUpGeo] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

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
    fetchAllLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuditLogs()
    }, 500)
    return () => clearTimeout(timer)
  }, [auditSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessionLogs()
    }, 500)
    return () => clearTimeout(timer)
  }, [sessionSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppLogs()
    }, 500)
    return () => clearTimeout(timer)
  }, [appSearch])

  const fetchAllLogs = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchAuditLogs(false),
        fetchSessionLogs(false),
        fetchAppLogs(false),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAuditLogs = async (showLoading = true) => {
    if (showLoading) setAuditLoading(true)
    setAuditCursor(null)
    try {
      const res = await fetch(`/api/admin/logs/audit?${new URLSearchParams({ search: auditSearch })}`)
      const token = res.headers.get("x-csrf-token")
      if (token) {
        setCsrfToken(token)
      }
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.logs)
        setAuditHasMore(data.hasMore)
        setAuditCursor(data.nextCursor)
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
    } finally {
      if (showLoading) setAuditLoading(false)
    }
  }

  const fetchSessionLogs = async (showLoading = true) => {
    if (showLoading) setSessionLoading(true)
    setSessionCursor(null)
    try {
      const res = await fetch(`/api/admin/logs/session?${new URLSearchParams({ search: sessionSearch })}`)
      if (res.ok) {
        const data = await res.json()
        setSessionLogs(data.logs)
        setSessionHasMore(data.hasMore)
        setSessionCursor(data.nextCursor)
      }
    } catch (error) {
      console.error("Failed to fetch session logs:", error)
    } finally {
      if (showLoading) setSessionLoading(false)
    }
  }

  const fetchAppLogs = async (showLoading = true) => {
    if (showLoading) setAppLoading(true)
    setAppCursor(null)
    try {
      const res = await fetch(`/api/admin/logs/app?${new URLSearchParams({ search: appSearch })}`)
      if (res.ok) {
        const data = await res.json()
        setAppLogs(data.logs)
        setAppHasMore(data.hasMore)
        setAppCursor(data.nextCursor)
      }
    } catch (error) {
      console.error("Failed to fetch app logs:", error)
    } finally {
      if (showLoading) setAppLoading(false)
    }
  }

  const lookupGeolocation = async (ipAddress: string, logType: "audit" | "session") => {
    setLookingUpGeo(ipAddress)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/logs/geolocation", {
        method: "POST",
        headers,
        body: JSON.stringify({ ipAddress, logType }),
      })

      if (res.ok) {
        const data = await res.json()
        // Refresh the appropriate log list to show updated geolocation
        if (logType === "audit") {
          fetchAuditLogs(false)
        } else {
          fetchSessionLogs(false)
        }
      }
    } catch (error) {
      console.error("Failed to lookup geolocation:", error)
    } finally {
      setLookingUpGeo(null)
    }
  }

  const loadMoreAudit = async () => {
    if (!auditCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({
        cursor: auditCursor,
        search: auditSearch,
      })
      const res = await fetch(`/api/admin/logs/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAuditLogs([...auditLogs, ...data.logs])
        setAuditHasMore(data.hasMore)
        setAuditCursor(data.nextCursor)
      }
    } catch (error) {
      console.error("Failed to load more audit logs:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  const loadMoreSession = async () => {
    if (!sessionCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({
        cursor: sessionCursor,
        search: sessionSearch,
      })
      const res = await fetch(`/api/admin/logs/session?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSessionLogs([...sessionLogs, ...data.logs])
        setSessionHasMore(data.hasMore)
        setSessionCursor(data.nextCursor)
      }
    } catch (error) {
      console.error("Failed to load more session logs:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  const loadMoreApp = async () => {
    if (!appCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({
        cursor: appCursor,
        search: appSearch,
      })
      const res = await fetch(`/api/admin/logs/app?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAppLogs([...appLogs, ...data.logs])
        setAppHasMore(data.hasMore)
        setAppCursor(data.nextCursor)
      }
    } catch (error) {
      console.error("Failed to load more app logs:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  const showLogDetails = (log: any) => {
    setSelectedLog(log)
    setIsModalOpen(true)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/logs/export", {
        method: "POST",
        headers,
        body: JSON.stringify({
          logType: activeTab,
          format: exportFormat,
        }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${activeTab}_logs_${Date.now()}.${exportFormat}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setIsExportModalOpen(false)
      }
    } catch (error) {
      console.error("Failed to export logs:", error)
    } finally {
      setIsExporting(false)
    }
  }

  // Check if mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Audit Logs Table
  const auditColumns: ColumnsType<AuditLog> = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      width: isMobile ? 90 : 180,
      fixed: isMobile ? "left" : undefined,
      render: (timestamp: string) => (
        <Flex vertical gap={2}>
          <Text style={{ fontSize: isMobile ? 11 : 13, whiteSpace: "nowrap" }}>
            {dayjs(timestamp).format(isMobile ? "MMM D" : "MMM D, YYYY")}
          </Text>
          <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11, whiteSpace: "nowrap" }}>
            {dayjs(timestamp).format("HH:mm")}
          </Text>
        </Flex>
      ),
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Admin",
      dataIndex: "admin",
      key: "admin",
      width: isMobile ? undefined : 200,
      responsive: ["md"] as any, // Hide on mobile
      ellipsis: true,
      render: (admin: any) => (
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 13 }}>{admin.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
            {admin.email}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      width: isMobile ? 120 : undefined,
      render: (action: string) => {
        const color =
          action.includes("DELETE") ? "red" :
          action.includes("CREATE") ? "green" :
          action.includes("UPDATE") ? "blue" :
          "default"
        // Shorten action text on mobile
        let displayText = action
        if (isMobile) {
          displayText = action
            .replace("UPDATE_SYSTEM_SETTINGS", "UPD_SETTINGS")
            .replace("UPDATE_USER_", "UPD_USER_")
            .replace("DELETE_", "DEL_")
            .replace("CREATE_", "NEW_")
            .replace("UPDATE_", "UPD_")
          // If still too long, truncate
          if (displayText.length > 15) {
            displayText = displayText.substring(0, 12) + "..."
          }
        }
        return (
          <Tag
            color={color}
            style={{
              fontSize: isMobile ? 10 : 12,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: isMobile ? 110 : "none"
            }}
          >
            {displayText}
          </Tag>
        )
      },
      filters: [
        { text: "Create", value: "CREATE" },
        { text: "Update", value: "UPDATE" },
        { text: "Delete", value: "DELETE" },
      ],
      onFilter: (value, record) => record.action.includes(value as string),
    },
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
      responsive: ["lg"] as any, // Hide on tablet and mobile
      render: (resource: string | null) => resource || "-",
    },
    {
      title: "IP Address",
      dataIndex: "ipAddress",
      key: "ipAddress",
      responsive: ["md"] as any, // Hide on mobile
      render: (ip: string | null, record: any) => (
        <Flex vertical gap={2}>
          <Flex align="center" gap={4}>
            <Text code style={{ fontSize: 11 }}>
              {ip || "unknown"}
            </Text>
            {ip && !record.country && (
              <Button
                type="link"
                size="small"
                icon={<EnvironmentOutlined />}
                loading={lookingUpGeo === ip}
                onClick={() => lookupGeolocation(ip, "audit")}
                style={{ padding: 0, height: "auto", fontSize: 10 }}
                title="Lookup location"
              />
            )}
          </Flex>
          {(record.city || record.country) && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              {[record.city, record.country].filter(Boolean).join(", ")}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showLogDetails(record)}
        >
          Details
        </Button>
      ),
    },
  ]

  // Session Logs Table
  const sessionColumns: ColumnsType<SessionLog> = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      width: isMobile ? 90 : 180,
      fixed: isMobile ? "left" : undefined,
      render: (timestamp: string) => (
        <Flex vertical gap={2}>
          <Text style={{ fontSize: isMobile ? 11 : 13, whiteSpace: "nowrap" }}>
            {dayjs(timestamp).format(isMobile ? "MMM D" : "MMM D, YYYY")}
          </Text>
          <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11, whiteSpace: "nowrap" }}>
            {dayjs(timestamp).format("HH:mm")}
          </Text>
        </Flex>
      ),
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
      width: isMobile ? undefined : 200,
      responsive: [("md")] as any, // Hide on mobile
      ellipsis: true,
      render: (user: any) => (
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 13 }}>{user.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
            {user.email}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Event",
      dataIndex: "event",
      key: "event",
      width: isMobile ? 100 : undefined,
      render: (event: string) => {
        // Shorten event text on mobile
        const displayText = isMobile && event.length > 12
          ? event.replace("PASSWORD_", "PWD_").replace("SESSION_", "")
          : event
        return <Tag style={{ fontSize: isMobile ? 10 : 12 }}>{displayText}</Tag>
      },
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      responsive: [("lg")] as any, // Hide on tablet and mobile
      render: (method: string | null) => method || "-",
    },
    {
      title: "Status",
      dataIndex: "success",
      key: "success",
      width: isMobile ? 80 : undefined,
      render: (success: boolean, record) => (
        <Flex vertical gap={2}>
          <Tag color={success ? "success" : "error"} style={{ fontSize: isMobile ? 10 : 12 }}>
            {success ? "OK" : "Fail"}
          </Tag>
          {!success && record.failReason && !isMobile && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.failReason}
            </Text>
          )}
        </Flex>
      ),
      filters: [
        { text: "Success", value: true },
        { text: "Failed", value: false },
      ],
      onFilter: (value, record) => record.success === value,
    },
    {
      title: "IP Address",
      dataIndex: "ipAddress",
      key: "ipAddress",
      responsive: [("md")] as any, // Hide on mobile
      render: (ip: string | null, record: any) => (
        <Flex vertical gap={2}>
          <Flex align="center" gap={4}>
            <Text code style={{ fontSize: 11 }}>
              {ip || "unknown"}
            </Text>
            {ip && !record.country && (
              <Button
                type="link"
                size="small"
                icon={<EnvironmentOutlined />}
                loading={lookingUpGeo === ip}
                onClick={() => lookupGeolocation(ip, "session")}
                style={{ padding: 0, height: "auto", fontSize: 10 }}
                title="Lookup location"
              />
            )}
          </Flex>
          {(record.city || record.country) && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              {[record.city, record.country].filter(Boolean).join(", ")}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 70 : undefined,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showLogDetails(record)}
          size={isMobile ? "small" : "middle"}
        >
          {isMobile ? "" : "Details"}
        </Button>
      ),
    },
  ]

  // App Logs Table
  const appLogColumns: ColumnsType<AppLog> = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      width: isMobile ? 90 : 180,
      fixed: isMobile ? "left" : undefined,
      render: (timestamp: string) => (
        <Flex vertical gap={2}>
          <Text style={{ fontSize: isMobile ? 11 : 13, whiteSpace: "nowrap" }}>
            {dayjs(timestamp).format(isMobile ? "MMM D" : "MMM D, YYYY")}
          </Text>
          <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11, whiteSpace: "nowrap" }}>
            {dayjs(timestamp).format("HH:mm")}
          </Text>
        </Flex>
      ),
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Level",
      dataIndex: "level",
      key: "level",
      width: isMobile ? 70 : undefined,
      render: (level: string) => {
        const color =
          level === "ERROR" ? "red" :
          level === "WARN" ? "orange" :
          level === "INFO" ? "blue" :
          "default"
        return <Tag color={color} style={{ fontSize: isMobile ? 10 : 12 }}>{level}</Tag>
      },
      filters: [
        { text: "ERROR", value: "ERROR" },
        { text: "WARN", value: "WARN" },
        { text: "INFO", value: "INFO" },
        { text: "DEBUG", value: "DEBUG" },
      ],
      onFilter: (value, record) => record.level === value,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: isMobile ? 80 : undefined,
      responsive: [("md")] as any, // Hide on mobile
      render: (category: string) => <Tag style={{ fontSize: 11 }}>{category}</Tag>,
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      width: isMobile ? 150 : undefined,
      ellipsis: true,
      render: (message: string) => (
        <Text style={{ fontSize: isMobile ? 11 : 13 }} ellipsis>
          {message}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 70 : undefined,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showLogDetails(record)}
          size={isMobile ? "small" : "middle"}
        >
          {isMobile ? "" : "Details"}
        </Button>
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
              <AuditOutlined style={{ fontSize: 32, color: "#1890ff" }} />
              <Title level={1} style={{ margin: 0 }}>System Logs</Title>
            </Flex>
            <Paragraph type="secondary">
              Monitor admin actions, user sessions, and application events
            </Paragraph>
          </Flex>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => setIsExportModalOpen(true)}
            >
              Export
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAllLogs}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Space>
        </Flex>

        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "audit",
                label: (
                  <Space>
                    <AuditOutlined />
                    <span>Admin Actions</span>
                  </Space>
                ),
                children: (
                  <Flex vertical gap="middle">
                    <Input
                      placeholder="Search by action, resource, or admin email..."
                      prefix={<SearchOutlined />}
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      allowClear
                      style={{ maxWidth: isMobile ? "100%" : 400 }}
                    />
                    <Table
                      columns={auditColumns}
                      dataSource={auditLogs}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: isMobile ? 400 : 1200 }}
                      size={isMobile ? "small" : "middle"}
                      loading={auditLoading}
                    />
                    {auditHasMore && (
                      <Flex justify="center" style={{ marginTop: 16 }}>
                        <Button
                          onClick={loadMoreAudit}
                          loading={loadingMore}
                          icon={<DownOutlined />}
                        >
                          Load More
                        </Button>
                      </Flex>
                    )}
                  </Flex>
                ),
              },
              {
                key: "session",
                label: (
                  <Space>
                    <UserOutlined />
                    <span>User Sessions</span>
                  </Space>
                ),
                children: (
                  <Flex vertical gap="middle">
                    <Input
                      placeholder="Search by event, user name, or email..."
                      prefix={<SearchOutlined />}
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      allowClear
                      style={{ maxWidth: isMobile ? "100%" : 400 }}
                    />
                    <Table
                      columns={sessionColumns}
                      dataSource={sessionLogs}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: isMobile ? 400 : 1200 }}
                      size={isMobile ? "small" : "middle"}
                      loading={sessionLoading}
                    />
                    {sessionHasMore && (
                      <Flex justify="center" style={{ marginTop: 16 }}>
                        <Button
                          onClick={loadMoreSession}
                          loading={loadingMore}
                          icon={<DownOutlined />}
                        >
                          Load More
                        </Button>
                      </Flex>
                    )}
                  </Flex>
                ),
              },
              {
                key: "app",
                label: (
                  <Space>
                    <ClockCircleOutlined />
                    <span>Application Logs</span>
                  </Space>
                ),
                children: (
                  <Flex vertical gap="middle">
                    <Input
                      placeholder="Search by message or category..."
                      prefix={<SearchOutlined />}
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      allowClear
                      style={{ maxWidth: isMobile ? "100%" : 400 }}
                    />
                    <Table
                      columns={appLogColumns}
                      dataSource={appLogs}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: isMobile ? 400 : 1200 }}
                      size={isMobile ? "small" : "middle"}
                      loading={appLoading}
                    />
                    {appHasMore && (
                      <Flex justify="center" style={{ marginTop: 16 }}>
                        <Button
                          onClick={loadMoreApp}
                          loading={loadingMore}
                          icon={<DownOutlined />}
                        >
                          Load More
                        </Button>
                      </Flex>
                    )}
                  </Flex>
                ),
              },
            ]}
          />
        </Card>

        {/* Details Modal */}
        <Modal
          title="Log Details"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>,
          ]}
          width={isMobile ? "95%" : 800}
          style={{ top: isMobile ? 20 : undefined }}
        >
          {selectedLog && (
            <Descriptions column={1} bordered size={isMobile ? "small" : "middle"}>
              {Object.entries(selectedLog).map(([key, value]) => (
                <Descriptions.Item
                  label={<span style={{ fontSize: isMobile ? 11 : 14, fontWeight: 500 }}>{key}</span>}
                  key={key}
                  contentStyle={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    maxWidth: isMobile ? "200px" : "600px"
                  }}
                >
                  {typeof value === "object" ? (
                    <pre style={{
                      margin: 0,
                      fontSize: isMobile ? 10 : 12,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      overflow: "auto",
                      maxWidth: "100%"
                    }}>
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <span style={{ fontSize: isMobile ? 11 : 14 }}>{String(value)}</span>
                  )}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </Modal>

        {/* Export Modal */}
        <Modal
          title="Export Logs"
          open={isExportModalOpen}
          onCancel={() => setIsExportModalOpen(false)}
          onOk={handleExport}
          confirmLoading={isExporting}
        >
          <Flex vertical gap="middle" style={{ marginTop: 16 }}>
            <div>
              <Text strong>Log Type</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue">{activeTab.toUpperCase()}</Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Exporting currently active tab
              </Text>
            </div>
            <div>
              <Text strong>Export Format</Text>
              <Select
                value={exportFormat}
                onChange={setExportFormat}
                style={{ width: "100%", marginTop: 8 }}
              >
                <Select.Option value="csv">CSV (Excel-compatible)</Select.Option>
                <Select.Option value="json">JSON (Developer-friendly)</Select.Option>
              </Select>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ℹ️ Export is limited to the last 10,000 records
              </Text>
            </div>
          </Flex>
        </Modal>
      </Flex>
    </SidebarLayout>
  )
}
