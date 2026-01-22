"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  Typography,
  Spin,
  Flex,
  Row,
  Col,
  Statistic,
  Progress,
  theme,
  Alert,
} from "antd"
import {
  LineChartOutlined,
  UserOutlined,
  CrownOutlined,
  TeamOutlined,
  ExportOutlined,
  BarChartOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
} from "@ant-design/icons"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Text, Paragraph } = Typography

interface CombinedStats {
  users: {
    total: number
    paid: number
    unpaid: number
    paidPercentage: number
  }
  activeUsers: {
    today: number
    week: number
    month: number
  }
  activity: {
    eventsToday: number
  }
  errors: {
    last24h: number
  }
  failedLogins: number
  criticalAlerts: number
  system: {
    totalLogs: number
  }
}

interface MetabaseDashboard {
  title: string
  description?: string
  url: string
}

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { token } = theme.useToken()
  const [stats, setStats] = useState<CombinedStats | null>(null)
  const [dashboards, setDashboards] = useState<MetabaseDashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if session becomes invalid (separate effect to catch session invalidation)
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
    fetchStats()
    // Only run once on mount when status becomes authenticated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const [statsRes, settingsRes] = await Promise.all([
        fetch("/api/admin/analytics/stats"),
        fetch("/api/admin/analytics/settings"),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setDashboards(settingsData.metabaseDashboards || [])
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !session || !stats) {
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
      <Flex vertical style={{ maxWidth: "1600px", margin: "0 auto", padding: "24px 16px", width: "100%" }}>
        <Flex vertical gap="small" style={{ marginBottom: 24 }}>
          <Flex align="center" gap="middle" wrap="wrap">
            <LineChartOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
            <Title level={1} style={{ margin: 0 }}>Analytics</Title>
          </Flex>
        </Flex>

        {/* Critical Alerts */}
        {stats.criticalAlerts > 0 && (
          <Alert
            message={`${stats.criticalAlerts} Active Critical Alert${stats.criticalAlerts > 1 ? "s" : ""}`}
            description="There are unresolved security or error alerts that require attention."
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <a href="/admin/alerts">View Alerts</a>
            }
          />
        )}

        {/* User Statistics */}
        <Title level={3} style={{ marginBottom: 16 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          User Statistics
        </Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Users"
                value={stats.users.total}
                prefix={<TeamOutlined />}
                valueStyle={{ color: token.colorPrimary }}
              />
              <Progress
                percent={100}
                showInfo={false}
                strokeColor={token.colorPrimaryActive}
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                total registered users
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Paid Users"
                value={stats.users.paid}
                prefix={<CrownOutlined />}
                valueStyle={{ color: token.colorSuccess }}
              />
              <Progress
                percent={stats.users.paidPercentage || 0}
                showInfo={false}
                strokeColor={token.colorSuccess}
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {stats.users.paidPercentage || 0}% of total users
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Free Users"
                value={stats.users.unpaid}
                prefix={<UserOutlined />}
                valueStyle={{ color: token.colorTextSecondary }}
              />
              <Progress
                percent={stats.users.total > 0 ? (stats.users.unpaid / stats.users.total) * 100 : 0}
                showInfo={false}
                strokeColor={token.colorTextSecondary}
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {stats.users.total > 0 ? ((stats.users.unpaid / stats.users.total) * 100).toFixed(1) : 0}% of total users
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Today"
                value={stats.activeUsers.today}
                prefix={<LineChartOutlined />}
                valueStyle={{ color: token.colorWarning }}
              />
              <Progress
                percent={stats.users.total > 0 ? (stats.activeUsers.today / stats.users.total) * 100 : 0}
                showInfo={false}
                strokeColor={token.colorWarning}
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {stats.users.total > 0 ? ((stats.activeUsers.today / stats.users.total) * 100).toFixed(1) : 0}% of total users
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Activity & System Metrics */}
        <Title level={3} style={{ marginBottom: 16 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          Activity & System
        </Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active (7d)"
                value={stats.activeUsers.week}
                prefix={<TeamOutlined />}
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active (30d)"
                value={stats.activeUsers.month}
                prefix={<TeamOutlined />}
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Events Today"
                value={stats.activity.eventsToday}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: token.colorSuccess }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Logs"
                value={stats.system.totalLogs.toLocaleString()}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Errors & Security */}
        <Title level={3} style={{ marginBottom: 16 }}>
          <WarningOutlined style={{ marginRight: 8 }} />
          Errors & Security
        </Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Errors (24h)"
                value={stats.errors.last24h}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: stats.errors.last24h > 20 ? token.colorError : undefined }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Failed Logins (24h)"
                value={stats.failedLogins}
                prefix={<WarningOutlined />}
                valueStyle={{ color: stats.failedLogins > 10 ? token.colorError : undefined }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Critical Alerts"
                value={stats.criticalAlerts}
                prefix={<WarningOutlined />}
                valueStyle={{ color: stats.criticalAlerts > 0 ? token.colorError : token.colorSuccess }}
              />
            </Card>
          </Col>
        </Row>

        {/* Metabase Dashboards */}
        {dashboards.length > 0 && (
          <>
            <Title level={3} style={{ marginBottom: 16 }}>
              <LineChartOutlined style={{ marginRight: 8 }} />
              External Analytics Dashboards
            </Title>
            <Row gutter={[16, 16]}>
              {dashboards.map((dashboard, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={index}>
                  <Card
                    hoverable
                    onClick={() => window.open(dashboard.url, "_blank")}
                    style={{ height: '100%' }}
                  >
                    <Flex vertical gap="small">
                      <Flex align="center" gap={8}>
                        <ExportOutlined style={{ color: token.colorPrimary }} />
                        <Text strong>{dashboard.title}</Text>
                      </Flex>
                      {dashboard.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dashboard.description}
                        </Text>
                      )}
                    </Flex>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Flex>
    </SidebarLayout>
  )
}
