"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, Button, Row, Col, Typography, theme, Flex, Space, Spin } from "antd"
import { ThunderboltOutlined, DollarOutlined, GlobalOutlined, LineChartOutlined, SyncOutlined, BellOutlined } from "@ant-design/icons"
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

  if (status === "loading") {
    return (
      <SidebarLayout>
        <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <Spin size="large" />
        </Flex>
      </SidebarLayout>
    )
  }

  if (session) {
    return null
  }

  const features = [
    {
      icon: <SyncOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
      title: "Real-Time Scanning",
      description: "Continuously monitors price differences across exchanges to find profitable arbitrage opportunities"
    },
    {
      icon: <GlobalOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
      title: "Multiple Exchanges",
      description: "Supports major cryptocurrency exchanges including Binance, Bybit, OKX, Gate.io, and more"
    },
    {
      icon: <LineChartOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
      title: "Spot & Futures",
      description: "Find arbitrage opportunities in both spot markets and futures/perpetual contracts"
    },
    {
      icon: <DollarOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
      title: "Profit Calculator",
      description: "Instantly calculate potential profits including fees and spread differences"
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
      title: "Fast Updates",
      description: "Price data refreshes every few seconds to catch time-sensitive opportunities"
    },
    {
      icon: <BellOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
      title: "Custom Filters",
      description: "Filter by minimum spread, trading pairs, exchanges, and volume thresholds"
    },
  ]

  return (
    <SidebarLayout>
      <Flex
        vertical
        align="center"
        style={{
          padding: '48px 24px',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Flex vertical style={{ maxWidth: '1200px', width: '100%' }}>
          {/* Hero Section */}
          <Flex vertical align="center" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <Title level={1} style={{ fontSize: '48px', marginBottom: '16px' }}>
              Crypto Arbitrage Scanner
            </Title>
            <Paragraph style={{ fontSize: '20px', color: token.colorTextSecondary, maxWidth: '700px', marginBottom: '32px' }}>
              Discover profitable cryptocurrency arbitrage opportunities across multiple exchanges in real-time.
              Compare prices, calculate spreads, and maximize your trading profits.
            </Paragraph>
            <Space size="large">
              <Link href="/signup">
                <Button type="primary" size="large" style={{ height: '48px', padding: '0 32px', fontSize: '16px' }}>
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="large" style={{ height: '48px', padding: '0 32px', fontSize: '16px' }}>
                  Sign In
                </Button>
              </Link>
            </Space>
          </Flex>

          {/* Features Grid */}
          <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
            Why Use ArbTool?
          </Title>
          <Row gutter={[24, 24]} style={{ marginBottom: '64px' }}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card
                  style={{ height: '100%', textAlign: 'center' }}
                  hoverable
                >
                  <Flex vertical align="center" gap={16}>
                    {feature.icon}
                    <Title level={4} style={{ marginBottom: 0 }}>{feature.title}</Title>
                    <Text type="secondary">{feature.description}</Text>
                  </Flex>
                </Card>
              </Col>
            ))}
          </Row>

          {/* How It Works */}
          <Card style={{ marginBottom: '32px' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: '32px' }}>
              How It Works
            </Title>
            <Row gutter={[48, 24]}>
              <Col xs={24} md={8}>
                <Flex vertical align="center" style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: token.colorPrimary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 'bold',
                    marginBottom: 16
                  }}>1</div>
                  <Title level={4}>Create Account</Title>
                  <Text type="secondary">Sign up for free and get instant access to the arbitrage scanner</Text>
                </Flex>
              </Col>
              <Col xs={24} md={8}>
                <Flex vertical align="center" style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: token.colorPrimary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 'bold',
                    marginBottom: 16
                  }}>2</div>
                  <Title level={4}>Set Your Filters</Title>
                  <Text type="secondary">Choose your preferred exchanges, trading pairs, and minimum spread</Text>
                </Flex>
              </Col>
              <Col xs={24} md={8}>
                <Flex vertical align="center" style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: token.colorPrimary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 'bold',
                    marginBottom: 16
                  }}>3</div>
                  <Title level={4}>Find Opportunities</Title>
                  <Text type="secondary">Browse real-time arbitrage opportunities and execute profitable trades</Text>
                </Flex>
              </Col>
            </Row>
          </Card>

          {/* CTA Section */}
          <Card style={{ background: token.colorPrimaryBg, textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: '16px' }}>
              Ready to Start Trading Smarter?
            </Title>
            <Paragraph style={{ color: token.colorTextSecondary, marginBottom: '24px' }}>
              Join traders who use ArbTool to find and capitalize on crypto arbitrage opportunities.
            </Paragraph>
            <Link href="/signup">
              <Button type="primary" size="large">
                Create Free Account
              </Button>
            </Link>
          </Card>
        </Flex>
      </Flex>
    </SidebarLayout>
  )
}
