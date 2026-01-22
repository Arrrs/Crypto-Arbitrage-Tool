"use client"

import { useSession } from "next-auth/react"
import { Card, Button, Typography, Space, Flex, Tag, List, Row, Col, theme } from "antd"
import {
  CheckCircleOutlined,
  CrownOutlined,
  StarOutlined,
  RocketOutlined,
} from "@ant-design/icons"
import Link from "next/link"
import SidebarLayout from "@/components/sidebar-layout"

const { Title, Paragraph, Text } = Typography

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  icon: React.ReactNode
  color: string
  popular?: boolean
  buttonText: string
  buttonType: "default" | "primary"
}

export default function PricingPage() {
  const { data: session } = useSession()
  const { token } = theme.useToken()

  const pricingTiers: PricingTier[] = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out our service",
      icon: <StarOutlined style={{ fontSize: 32 }} />,
      color: token.colorTextSecondary,
      features: [
        "Basic features access",
        "Community support",
        "1 user account",
        "Limited storage",
        "Email notifications",
      ],
      buttonText: session ? "Current Plan" : "Get Started",
      buttonType: "default",
    },
    {
      name: "Pro",
      price: "$9.99",
      period: "per month",
      description: "Best for professionals and small teams",
      icon: <RocketOutlined style={{ fontSize: 32 }} />,
      color: token.colorPrimary,
      popular: true,
      features: [
        "All Free features",
        "Priority support",
        "Up to 5 user accounts",
        "50GB storage",
        "Advanced analytics",
        "Custom branding",
        "API access",
        "Export data",
      ],
      buttonText: "Upgrade to Pro",
      buttonType: "primary",
    },
    {
      name: "Enterprise",
      price: "$29.99",
      period: "per month",
      description: "For large organizations with advanced needs",
      icon: <CrownOutlined style={{ fontSize: 32 }} />,
      color: token.colorWarning,
      features: [
        "All Pro features",
        "24/7 dedicated support",
        "Unlimited users",
        "Unlimited storage",
        "Advanced security",
        "Custom integrations",
        "SLA guarantee",
        "Training & onboarding",
        "Account manager",
      ],
      buttonText: "Contact Sales",
      buttonType: "primary",
    },
  ]

  return (
    <SidebarLayout>
      <Flex
        vertical
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "64px 16px",
          width: "100%",
        }}
      >
        {/* Header */}
        <Flex vertical align="center" style={{ marginBottom: 64, textAlign: "center" }}>
          <Title level={1} style={{ fontSize: 48, marginBottom: 16 }}>
            Choose Your Plan
          </Title>
          <Paragraph
            type="secondary"
            style={{ fontSize: 18, maxWidth: 600 }}
          >
            Select the perfect plan for your needs. Upgrade, downgrade, or cancel
            anytime.
          </Paragraph>
        </Flex>

        {/* Pricing Cards */}
        <Row gutter={[24, 24]} justify="center">
          {pricingTiers.map((tier, index) => (
            <Col xs={24} md={12} lg={8} key={index}>
              <Card
                hoverable
                style={{
                  height: "100%",
                  position: "relative",
                  border: tier.popular
                    ? `2px solid ${token.colorPrimary}`
                    : undefined,
                  display: "flex",
                  flexDirection: "column",
                }}
                bodyStyle={{ flex: 1, display: "flex", flexDirection: "column" }}
              >
                {tier.popular && (
                  <Tag
                    color="blue"
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    MOST POPULAR
                  </Tag>
                )}

                <Flex vertical gap="large" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  {/* Icon */}
                  <Flex justify="center" style={{ color: tier.color }}>
                    {tier.icon}
                  </Flex>

                  {/* Header */}
                  <Flex vertical align="center" style={{ textAlign: "center" }}>
                    <Title level={3} style={{ marginBottom: 8 }}>
                      {tier.name}
                    </Title>
                    <Flex align="baseline" gap="small" style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 40, fontWeight: 700 }}>
                        {tier.price}
                      </Text>
                      <Text type="secondary">/ {tier.period}</Text>
                    </Flex>
                    <Paragraph type="secondary">{tier.description}</Paragraph>
                  </Flex>

                  {/* Features */}
                  <List
                    dataSource={tier.features}
                    renderItem={(feature) => (
                      <List.Item style={{ border: "none", padding: "8px 0" }}>
                        <Space>
                          <CheckCircleOutlined
                            style={{ color: token.colorSuccess, fontSize: 16 }}
                          />
                          <Text>{feature}</Text>
                        </Space>
                      </List.Item>
                    )}
                    style={{ flex: 1, marginBottom: 0 }}
                  />

                  {/* Button - pushed to bottom with margin-top: auto */}
                  <Button
                    type={tier.buttonType}
                    size="large"
                    block
                    style={{
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                      marginTop: "auto",
                    }}
                  >
                    {tier.buttonText}
                  </Button>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>

        {/* FAQ or Additional Info */}
        <Flex
          vertical
          align="center"
          style={{ marginTop: 80, textAlign: "center" }}
        >
          <Title level={2} style={{ marginBottom: 24 }}>
            Frequently Asked Questions
          </Title>
          <Space direction="vertical" size="large" style={{ maxWidth: 800 }}>
            <Flex vertical gap="small">
              <Title level={4}>Can I change my plan later?</Title>
              <Paragraph type="secondary">
                Yes! You can upgrade, downgrade, or cancel your subscription at any
                time. Changes take effect at the start of your next billing cycle.
              </Paragraph>
            </Flex>
            <Flex vertical gap="small">
              <Title level={4}>What payment methods do you accept?</Title>
              <Paragraph type="secondary">
                We accept all major credit cards, PayPal, and bank transfers for
                Enterprise plans.
              </Paragraph>
            </Flex>
            <Flex vertical gap="small">
              <Title level={4}>Is there a free trial?</Title>
              <Paragraph type="secondary">
                The Free plan is available forever with no credit card required. You
                can upgrade to Pro or Enterprise anytime to access more features.
              </Paragraph>
            </Flex>
            <Flex vertical gap="small">
              <Title level={4}>Do you offer refunds?</Title>
              <Paragraph type="secondary">
                Yes, we offer a 30-day money-back guarantee on all paid plans. If
                you're not satisfied, contact us for a full refund.
              </Paragraph>
            </Flex>
          </Space>
        </Flex>

        {/* CTA */}
        <Flex
          vertical
          align="center"
          style={{
            marginTop: 80,
            padding: 48,
            background: token.colorBgContainer,
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <Title level={2} style={{ marginBottom: 16 }}>
            Still have questions?
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 24 }}>
            Our team is here to help. Contact us for personalized assistance.
          </Paragraph>
          <Space size="middle">
            <Link href="/profile">
              <Button size="large">Contact Support</Button>
            </Link>
            {!session && (
              <Link href="/signup">
                <Button type="primary" size="large">
                  Get Started Free
                </Button>
              </Link>
            )}
          </Space>
        </Flex>
      </Flex>
    </SidebarLayout>
  )
}
