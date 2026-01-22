"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, Button, Row, Col, Typography, theme, Flex, Space, List, Spin } from "antd"
import { SafetyOutlined, UserAddOutlined, LockOutlined, TeamOutlined, KeyOutlined, SettingOutlined } from "@ant-design/icons"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Paragraph, Text } = Typography

export default function HomePage() {
  const { token } = theme.useToken()
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (session) {
      router.replace("/profile")
    }
  }, [session, status, router])

  // Show loading spinner while checking session
  if (status === "loading") {
    return (
      <SidebarLayout>
        <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <Spin size="large" />
        </Flex>
      </SidebarLayout>
    )
  }

  // Don't render homepage if user is logged in (will redirect)
  if (session) {
    return null
  }

  return (
    <SidebarLayout>
      <Flex
        vertical
        align="center"
        justify="center"
        style={{
          padding: '48px 24px',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Flex vertical style={{ maxWidth: '1200px', width: '100%' }}>
          <Flex vertical align="center" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <Title level={1} style={{ fontSize: '48px', marginBottom: '16px' }}>
              Welcome to Auth App
            </Title>
            <Paragraph style={{ fontSize: '20px', color: token.colorTextSecondary }}>
              A secure authentication system built with Next.js, Auth.js, and Prisma
            </Paragraph>
          </Flex>

          <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
            <Col xs={24} md={12}>
              <Card>
                <Title level={2} style={{ fontSize: '24px', marginBottom: '16px' }}>
                  Features
                </Title>
                <List
                  dataSource={[
                    { icon: <SafetyOutlined />, text: 'Secure authentication with Auth.js' },
                    { icon: <UserAddOutlined />, text: 'User registration and login' },
                    { icon: <SettingOutlined />, text: 'Profile management' },
                    { icon: <TeamOutlined />, text: 'Admin dashboard' },
                    { icon: <LockOutlined />, text: 'Role-based access control' },
                    { icon: <KeyOutlined />, text: 'Password management' },
                  ]}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '6px 0' }}>
                      <Space align="start">
                        <Text style={{ color: token.colorPrimary, marginTop: '4px' }}>{item.icon}</Text>
                        <Text>{item.text}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card>
                <Title level={2} style={{ fontSize: '24px', marginBottom: '16px' }}>
                  Get Started
                </Title>
                <Paragraph style={{ color: token.colorTextSecondary, marginBottom: '24px' }}>
                  Create an account or sign in to access your dashboard and manage your profile.
                </Paragraph>
                <Space size="middle">
                  <Link href="/signup">
                    <Button type="primary" size="large">
                      Sign Up
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="large">Login</Button>
                  </Link>
                </Space>
              </Card>
            </Col>
          </Row>

          <Card>
            <Title level={2} style={{ fontSize: '24px', marginBottom: '24px' }}>
              Tech Stack
            </Title>
            <Row gutter={[24, 24]}>
              {[
                { name: 'Next.js 15', desc: 'Framework' },
                { name: 'Auth.js v5', desc: 'Authentication' },
                { name: 'Prisma', desc: 'ORM' },
                { name: 'Ant Design', desc: 'UI Library' },
              ].map((tech, index) => (
                <Col xs={12} md={6} key={index}>
                  <Flex vertical align="center" style={{ textAlign: 'center' }}>
                    <Text strong style={{ fontSize: '18px', marginBottom: '4px' }}>{tech.name}</Text>
                    <Text type="secondary" style={{ fontSize: '14px' }}>{tech.desc}</Text>
                  </Flex>
                </Col>
              ))}
            </Row>
          </Card>
        </Flex>
      </Flex>
    </SidebarLayout>
  )
}
