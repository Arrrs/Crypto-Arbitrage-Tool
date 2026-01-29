"use client"

import { Card, Result, Space, Button, Typography, Flex, theme } from "antd"
import { LockOutlined, CrownOutlined, ArrowRightOutlined } from "@ant-design/icons"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Paragraph, Text } = Typography

interface PremiumGateProps {
  feature: string
}

export default function PremiumGate({ feature }: PremiumGateProps) {
  const { token } = theme.useToken()

  return (
    <SidebarLayout>
      <Flex
        vertical
        align="center"
        justify="center"
        style={{ minHeight: "calc(100vh - 64px)", padding: "32px 16px" }}
      >
        <Card style={{ maxWidth: "800px", width: "100%" }}>
          <Result
            icon={<LockOutlined style={{ color: token.colorWarning, fontSize: 72 }} />}
            title={
              <Title level={2} style={{ marginTop: 16 }}>
                Premium Feature
              </Title>
            }
            subTitle={
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Paragraph style={{ fontSize: 16 }}>
                  {feature} is available to subscribers only.
                </Paragraph>
                <Card
                  style={{
                    background: `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorWarning}15 100%)`,
                    border: `1px solid ${token.colorPrimary}30`,
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: "100%" }}>
                    <Flex align="center" gap="small">
                      <CrownOutlined style={{ fontSize: 24, color: token.colorWarning }} />
                      <Title level={4} style={{ margin: 0 }}>
                        Unlock Premium Features
                      </Title>
                    </Flex>
                    <ul style={{ margin: "16px 0", paddingLeft: 20 }}>
                      <li>
                        <Text>Real-time arbitrage opportunities</Text>
                      </li>
                      <li>
                        <Text>Spot and Futures market analysis</Text>
                      </li>
                      <li>
                        <Text>Advanced filtering and sorting</Text>
                      </li>
                      <li>
                        <Text>Network deposit/withdraw status</Text>
                      </li>
                      <li>
                        <Text>Auto-refresh with configurable intervals</Text>
                      </li>
                      <li>
                        <Text>Priority customer support</Text>
                      </li>
                    </ul>
                  </Space>
                </Card>
              </Space>
            }
            extra={
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Link href="/pricing">
                  <Button type="primary" size="large" icon={<CrownOutlined />} block>
                    Upgrade to Premium
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button size="large" icon={<ArrowRightOutlined />} block>
                    Back to Dashboard
                  </Button>
                </Link>
              </Space>
            }
          />
        </Card>
      </Flex>
    </SidebarLayout>
  )
}
