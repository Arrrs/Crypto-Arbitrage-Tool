"use client"

import { useState, useEffect } from "react"
import { Layout, Menu, Avatar, Dropdown, Button, Space, Switch, Typography, Drawer, Flex, theme as antdTheme, App, Modal } from "antd"
import type { MenuProps } from "antd"
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CrownOutlined,
  LineChartOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  BellOutlined,
  ControlOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "./theme-provider"
import { ReactNode } from "react"

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface SidebarLayoutProps {
  children: ReactNode
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const { theme: appTheme, toggleTheme } = useTheme()
  const { token } = antdTheme.useToken()
  const { message, modal } = App.useApp()
  // Sidebar is always collapsed by default, toggles on button click
  const [collapsed, setCollapsed] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isLoading = status === "loading"

  // Toggle sidebar collapse
  const toggleCollapse = () => {
    setCollapsed(!collapsed)
  }

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Check on mount
    checkMobile()

    // Add resize listener
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])


  const handleLogout = () => {
    modal.confirm({
      title: "Sign Out",
      icon: <ExclamationCircleOutlined />,
      content: "Are you sure you want to sign out?",
      okText: "Sign Out",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setIsLoggingOut(true)

        // Show loading message that stays visible
        const hideMessage = message.loading("Signing out...", 0)

        try {
          // Set flag to indicate intentional logout (prevents SessionWatcher from showing error)
          sessionStorage.setItem("intentional_logout", "true")
          await signOut({ redirect: false })

          // Destroy the message before redirecting
          hideMessage()
          message.destroy()

          router.push("/login")
        } catch (error) {
          // Hide loading and show error message
          hideMessage()
          message.error("Failed to sign out. Please try again.")

          // Reset loading state
          setIsLoggingOut(false)
        }
      },
    })
  }

  const userMenuItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <Space direction="vertical" size={0}>
          <Text strong>{session?.user.name || "User"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {session?.user.email}
          </Text>
        </Space>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "profile-settings",
      icon: <SettingOutlined />,
      label: <Link href="/profile/settings">Profile Settings</Link>,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign Out",
      danger: true,
      disabled: isLoggingOut,
      onClick: handleLogout,
    },
  ]

  const sidebarMenuItems: MenuProps["items"] = [
    {
      key: "/",
      icon: <HomeOutlined />,
      label: <Link href="/">Home</Link>,
    },
    {
      key: "/profile",
      icon: <UserOutlined />,
      label: <Link href="/profile">Profile</Link>,
    },
    {
      key: "/pricing",
      icon: <CrownOutlined />,
      label: <Link href="/pricing">Pricing</Link>,
    },
    {
      key: "/features",
      icon: <CrownOutlined />,
      label: <Link href="/features">Features</Link>,
    },
    ...(session?.user.role === "ADMIN"
      ? [
          {
            key: "/admin/users",
            icon: <TeamOutlined />,
            label: <Link href="/admin/users">Users</Link>,
          },
          {
            key: "/admin/analytics",
            icon: <LineChartOutlined />,
            label: <Link href="/admin/analytics">Analytics</Link>,
          },
          {
            key: "/admin/logs",
            icon: <AuditOutlined />,
            label: <Link href="/admin/logs">Logs</Link>,
          },
          {
            key: "/admin/cron",
            icon: <ClockCircleOutlined />,
            label: <Link href="/admin/cron">Cron Jobs</Link>,
          },
          {
            key: "/admin/alerts",
            icon: <BellOutlined />,
            label: <Link href="/admin/alerts">Alerts</Link>,
          },
          {
            key: "/admin/settings",
            icon: <ControlOutlined />,
            label: <Link href="/admin/settings">Settings</Link>,
          },
        ]
      : []),
  ]

  const SidebarContent = () => (
    <Flex vertical style={{ height: "100%" }}>
      {/* Logo Section */}
      <Flex
        align="center"
        justify="center"
        style={{
          height: 64,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        <Link href="/">
          <Text
            strong
            style={{
              fontSize: collapsed ? 16 : token.fontSizeHeading4,
              color: token.colorPrimary,
            }}
          >
            {collapsed ? "AA" : "AUTH APP"}
          </Text>
        </Link>
      </Flex>

      {/* Menu - grows to fill space */}
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={sidebarMenuItems}
        style={{
          borderRight: 0,
          flex: 1,
          overflow: "auto",
        }}
      />

      {/* Bottom Section - Toggle Button & Mobile User Profile */}
      <Flex vertical style={{ flexShrink: 0 }}>
        {/* Desktop Toggle Button */}
        {!isMobile && (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapse}
            style={{
              width: "100%",
              height: 48,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        )}

        {/* Theme Toggle - Only on Mobile */}
        {isMobile && (
          <Flex
            align="center"
            justify="space-between"
            style={{
              padding: "12px 16px",
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Text type="secondary">Theme</Text>
            <Space size="small">
              <SunOutlined style={{ color: appTheme === "light" ? token.colorPrimary : token.colorTextSecondary }} />
              <Switch checked={appTheme === "dark"} onChange={toggleTheme} size="small" />
              <MoonOutlined style={{ color: appTheme === "dark" ? token.colorPrimary : token.colorTextSecondary }} />
            </Space>
          </Flex>
        )}

        {/* User Profile - Only on Mobile */}
        {isMobile && (
          <Flex
            style={{
              padding: "12px 16px",
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = token.colorBgTextHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="topRight">
              <Flex align="center" gap={12} style={{ width: "100%" }}>
                <Avatar
                  size={40}
                  src={session?.user?.image || undefined}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: token.colorPrimary, flexShrink: 0 }}
                >
                  {!session?.user?.image ? session?.user?.name?.[0]?.toUpperCase() : null}
                </Avatar>
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                  <Text strong ellipsis>
                    {session?.user?.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                    {session?.user?.email}
                  </Text>
                </Flex>
              </Flex>
            </Dropdown>
          </Flex>
        )}
      </Flex>
    </Flex>
  )

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop Sidebar */}
      {!isMobile && session && (
        <Sider
          collapsed={collapsed}
          trigger={null}
          width={200}
          collapsedWidth={80}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            transition: "all 0.2s",
          }}
        >
          <SidebarContent />
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && session && (
        <Drawer
          placement="left"
          closable={false}
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          width={240}
          styles={{
            body: { padding: 0, background: token.colorBgContainer },
          }}
        >
          <SidebarContent />
        </Drawer>
      )}

      <Layout style={{ marginLeft: !isMobile && session ? (collapsed ? 80 : 200) : 0, transition: "margin-left 0.2s" }}>
        {/* Header */}
        <Header
          style={{
            padding: "0 24px",
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: "sticky",
            top: 0,
            zIndex: 1,
            width: "100%",
          }}
        >
          <Flex align="center" justify="space-between" style={{ height: "100%", width: "100%" }}>
            {/* Left side - Logo or Menu Button */}
            {isMobile && session ? (
              // Mobile + Logged in: Show menu button
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ fontSize: 18 }}
              />
            ) : !isLoading && !session ? (
              // Not logged in (after loading): Show AA logo
              <Link href="/">
                <Text
                  strong
                  style={{
                    fontSize: token.fontSizeHeading4,
                    color: token.colorPrimary,
                  }}
                >
                  AA
                </Text>
              </Link>
            ) : (
              // Desktop + Logged in OR Loading: Empty (logo is in sidebar)
              <Flex />
            )}

            {/* Right side - Theme Toggle and User Menu */}
            <Flex align="center" gap="middle" style={{ marginLeft: "auto" }}>
              {/* Theme Toggle */}
              {/* Desktop: Always show | Mobile: Only show when NOT logged in */}
              {(!isMobile || (isMobile && !isLoading && !session)) && (
                <Space size="small">
                  <SunOutlined style={{ color: appTheme === "light" ? token.colorPrimary : token.colorTextSecondary }} />
                  <Switch
                    checked={appTheme === "dark"}
                    onChange={toggleTheme}
                  />
                  <MoonOutlined style={{ color: appTheme === "dark" ? token.colorPrimary : token.colorTextSecondary }} />
                </Space>
              )}

              {/* Desktop: Show user dropdown OR login/signup */}
              {!isMobile && session && (
                <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="bottomRight">
                  <Avatar
                    size="large"
                    src={session.user.image || undefined}
                    icon={<UserOutlined />}
                    style={{
                      cursor: "pointer",
                      backgroundColor: token.colorPrimary,
                      border: `2px solid ${token.colorBorder}`,
                    }}
                  >
                    {!session.user.image ? (session.user.name?.[0]?.toUpperCase() || "U") : null}
                  </Avatar>
                </Dropdown>
              )}

              {/* Login/Signup buttons when not logged in */}
              {!isLoading && !session && (
                <Space size={isMobile ? "small" : "middle"}>
                  <Link href="/login">
                    <Button type="link" size={isMobile ? "small" : "middle"}>Login</Button>
                  </Link>
                  <Link href="/signup">
                    <Button type="primary" size={isMobile ? "small" : "middle"}>Sign Up</Button>
                  </Link>
                </Space>
              )}
            </Flex>
          </Flex>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: 0,
            background: token.colorBgLayout,
            minHeight: "calc(100vh - 64px)",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
