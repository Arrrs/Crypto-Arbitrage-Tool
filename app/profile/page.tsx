'use client'

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, Tag, Row, Col, Typography, Space, Avatar, Divider, Flex, Spin, Button, Badge, Progress, theme } from "antd"
import {
  UserOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  TeamOutlined,
  LoadingOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  SafetyOutlined,
} from "@ant-design/icons"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Paragraph, Text } = Typography

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { token } = theme.useToken()

  // Redirect if session becomes invalid
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Load profile data only once on mount
  useEffect(() => {
    if (status === "loading") return
    if (!session) return

    async function loadData() {
      try {
        // Fetch full user profile with subscription info
        const profileResponse = await fetch('/api/user/profile')
        const profileData = await profileResponse.json()
        if (profileData.user) {
          setUserProfile(profileData.user)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const getDaysRemaining = (paidUntil: string | null) => {
    if (!paidUntil) return 0
    const now = new Date()
    const expiryDate = new Date(paidUntil)
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  if (status === "loading" || loading || !session) {
    return (
      <SidebarLayout>
        <Flex align="center" justify="center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            size="large"
          />
        </Flex>
      </SidebarLayout>
    )
  }

  const daysRemaining = userProfile?.paidUntil ? getDaysRemaining(userProfile.paidUntil) : 0
  const subscriptionProgress = userProfile?.paidUntil
    ? Math.max(0, Math.min(100, (daysRemaining / 30) * 100))
    : 0

  return (
    <SidebarLayout>
      <Flex vertical style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Subscription Status Card */}
          {userProfile && (
            <Card
              style={{
                background: userProfile.isPaid
                  ? `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorWarning}15 100%)`
                  : undefined,
                border: userProfile.isPaid ? `1px solid ${token.colorPrimary}30` : undefined,
              }}
            >
              <Flex justify="space-between" align="center" wrap="wrap" gap="large" style={{ minHeight: '60px' }}>
                <Flex align="center" gap="large" style={{ flex: 1, minWidth: '280px' }}>
                  {userProfile.isPaid ? (
                    <Badge.Ribbon text="PREMIUM" color="gold" style={{ fontSize: '10px' }}>
                      <Avatar
                        size={56}
                        icon={<CrownOutlined />}
                        style={{ backgroundColor: token.colorWarning, flexShrink: 0 }}
                      />
                    </Badge.Ribbon>
                  ) : (
                    <Avatar
                      size={56}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: token.colorTextSecondary, flexShrink: 0 }}
                    />
                  )}
                  <Flex vertical gap={6} style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: '18px', lineHeight: '24px' }}>
                      {userProfile.isPaid ? "Premium Plan" : "Free Plan"}
                    </Text>
                    {userProfile.isPaid && userProfile.paidUntil && (
                      <Flex gap="small" align="center" wrap="wrap">
                        <Text type="secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                          Expires: {new Date(userProfile.paidUntil).toLocaleDateString()}
                        </Text>
                        {daysRemaining > 0 && (
                          <>
                            <Text type="secondary" style={{ fontSize: '13px' }}>•</Text>
                            <Text type="secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                              {daysRemaining} days left
                            </Text>
                          </>
                        )}
                      </Flex>
                    )}
                    {userProfile.isPaid && daysRemaining === 0 && (
                      <Tag color="error" style={{ marginRight: 0, fontSize: '12px', padding: '2px 8px' }}>Expired</Tag>
                    )}
                  </Flex>
                </Flex>

                <Flex align="center" gap="large" wrap="wrap" style={{ justifyContent: 'flex-end' }}>
                  {userProfile.isPaid && daysRemaining > 0 && (
                    <Progress
                      percent={subscriptionProgress}
                      strokeColor={{
                        '0%': token.colorError,
                        '50%': token.colorWarning,
                        '100%': token.colorSuccess,
                      }}
                      showInfo={false}
                      style={{ width: 160, minWidth: 120 }}
                    />
                  )}
                  <Link href="/pricing">
                    <Button
                      type={userProfile.isPaid ? "default" : "primary"}
                      icon={userProfile.isPaid ? <CrownOutlined /> : <DollarOutlined />}
                      size="large"
                    >
                      {userProfile.isPaid ? "Manage" : "Upgrade"}
                    </Button>
                  </Link>
                </Flex>
              </Flex>
            </Card>
          )}

          <Card>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8} md={6}>
                <Flex vertical align="center" gap="middle">
                  <Badge
                    count={userProfile?.isPaid ? <CrownOutlined style={{ color: token.colorWarning }} /> : 0}
                    offset={[-10, 80]}
                  >
                    <Avatar
                      size={80}
                      src={session.user.image || undefined}
                      icon={<UserOutlined />}
                    >
                      {!session.user.image ? session.user.name?.[0]?.toUpperCase() : null}
                    </Avatar>
                  </Badge>
                  <Flex vertical align="center" gap={4}>
                    <Text strong style={{ fontSize: 16 }}>{session.user.name}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>{session.user.email}</Text>
                  </Flex>
                </Flex>
              </Col>

              <Col xs={24} sm={16} md={18}>
                <Flex vertical gap="middle" style={{ height: '100%' }}>
                  <Flex wrap="wrap" gap="middle">
                    <Flex vertical gap={4}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Role</Text>
                      <Tag color={session.user.role === "ADMIN" ? "green" : "blue"}>
                        {session.user.role}
                      </Tag>
                    </Flex>

                    {userProfile && (
                      <Flex vertical gap={4}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                        <Space size="small" wrap>
                          {userProfile.emailVerified && (
                            <Tag icon={<CheckCircleOutlined />} color="success" style={{ margin: 0 }}>
                              Verified
                            </Tag>
                          )}
                          {userProfile.adminVerified && (
                            <Tag icon={<SafetyOutlined />} color="purple" style={{ margin: 0 }}>
                              Admin Verified
                            </Tag>
                          )}
                          {!userProfile.emailVerified && !userProfile.adminVerified && (
                            <Tag color="default" style={{ margin: 0 }}>Not Verified</Tag>
                          )}
                        </Space>
                      </Flex>
                    )}
                  </Flex>

                  <Divider style={{ margin: '8px 0' }} />

                  <Flex gap="small" wrap="wrap">
                    <Link href="/profile/settings">
                      <Button icon={<EditOutlined />}>Profile Settings</Button>
                    </Link>
                    <Link href="/pricing">
                      <Button icon={<CrownOutlined />}>Pricing</Button>
                    </Link>
                    {session.user.role === "ADMIN" && (
                      <Link href="/admin/analytics">
                        <Button icon={<TeamOutlined />}>Analytics</Button>
                      </Link>
                    )}
                  </Flex>
                </Flex>
              </Col>
            </Row>
          </Card>
        </Space>
      </Flex>
    </SidebarLayout>
  )
}
