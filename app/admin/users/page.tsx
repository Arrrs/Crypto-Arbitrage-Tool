"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Spin,
  Space,
  Popconfirm,
  Typography,
  Avatar,
  Flex,
  List,
  Tabs,
  Switch,
  DatePicker,
  Tooltip,
  Badge,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  DeleteFilled,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  SafetyOutlined,
  SearchOutlined,
} from "@ant-design/icons"
import SidebarLayout from "@/components/sidebar-layout"
import dayjs from "dayjs"

const { Title, Paragraph, Text } = Typography

interface User {
  id: string
  name: string | null
  email: string
  role: string
  image: string | null
  emailVerified: string | null
  adminVerified: boolean
  isPaid: boolean
  paidUntil: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editForm] = Form.useForm()
  const [createForm] = Form.useForm()
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined)

  // Redirect if session becomes invalid
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    if (session.user.role !== "ADMIN") {
      router.push("/profile")
    }
  }, [session, status, router])

  // Load initial data only once on mount
  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "ADMIN") return
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const token = response.headers.get("x-csrf-token")
      if (token) {
        setCsrfToken(token)
      }
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
      message.error("Failed to fetch users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    editForm.setFieldsValue({
      name: user.name || "",
      email: user.email,
      role: user.role,
      adminVerified: user.adminVerified,
      emailVerified: !!user.emailVerified,
      isPaid: user.isPaid,
      paidUntil: user.paidUntil ? dayjs(user.paidUntil) : null,
    })
    setIsEditModalOpen(true)
  }

  const handleCreateUser = async () => {
    try {
      const values = await createForm.validateFields()

      // Don't send isPaid - it will be auto-calculated on the server
      const { isPaid, ...dataToSend } = values

      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...dataToSend,
          paidUntil: values.paidUntil ? values.paidUntil.toISOString() : null,
        }),
      })

      if (response.ok) {
        message.success("User created successfully")
        await fetchUsers()
        setIsCreateModalOpen(false)
        createForm.resetFields()
      } else {
        const data = await response.json()
        message.error(data.error || "Failed to create user")
      }
    } catch (error) {
      message.error("An error occurred. Please try again.")
    }
  }

  const handleUpdate = async () => {
    if (!selectedUser) return

    setIsUpdating(true)
    try {
      const values = await editForm.validateFields()

      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      // Don't send isPaid - it will be auto-calculated on the server based on paidUntil
      const response = await fetch(`/api/admin/users/${selectedUser.id}/update`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          role: values.role,
          adminVerified: values.adminVerified,
          emailVerified: values.emailVerified,
          paidUntil: values.paidUntil ? values.paidUntil.toISOString() : null,
        }),
      })

      if (response.ok) {
        message.success("User updated successfully")
        await fetchUsers()
        setIsEditModalOpen(false)
        setSelectedUser(null)
        editForm.resetFields()
      } else {
        const data = await response.json()
        message.error(data.error || "Failed to update user")
      }
    } catch (error) {
      message.error("An error occurred. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (user: User) => {
    try {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers,
      })

      if (response.ok) {
        message.success("User deleted successfully")
        await fetchUsers()
      } else {
        const data = await response.json()
        message.error(data.error || "Failed to delete user")
      }
    } catch (error) {
      message.error("An error occurred. Please try again.")
    }
  }

  const handleDeleteAvatar = async (userId: string) => {
    try {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const response = await fetch(`/api/admin/users/${userId}/avatar`, {
        method: "DELETE",
        headers,
      })

      if (response.ok) {
        message.success("Avatar deleted successfully")
        await fetchUsers()
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser({ ...selectedUser, image: null })
        }
      } else {
        const data = await response.json()
        message.error(data.error || "Failed to delete avatar")
      }
    } catch (error) {
      message.error("An error occurred. Please try again.")
    }
  }

  const getFilteredUsers = () => {
    let filtered = users

    // Filter by tab (paid/unpaid/all)
    if (activeTab === "paid") {
      filtered = filtered.filter(user => user.isPaid)
    } else if (activeTab === "unpaid") {
      filtered = filtered.filter(user => !user.isPaid)
    }

    // Filter by search text (name or email)
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      )
    }

    // Filter by role
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    return filtered
  }

  const columns: ColumnsType<User> = [
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <Space>
          <Badge
            count={record.isPaid ? <CrownOutlined style={{ color: "#faad14" }} /> : 0}
            offset={[-5, 35]}
          >
            <Avatar
              size={40}
              src={record.image || undefined}
              icon={<UserOutlined />}
            >
              {!record.image && name ? name[0].toUpperCase() : null}
            </Avatar>
          </Badge>
          <Flex vertical gap={2}>
            <Text strong>{name || "N/A"}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </Flex>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={role === "ADMIN" ? "green" : "blue"}>{role}</Tag>
      ),
    },
    {
      title: "Verification",
      key: "verification",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.emailVerified && (
            <Tooltip title="Email Verified">
              <Tag icon={<CheckCircleOutlined />} color="success">Email</Tag>
            </Tooltip>
          )}
          {record.adminVerified && (
            <Tooltip title="Admin Verified">
              <Tag icon={<SafetyOutlined />} color="purple">Admin</Tag>
            </Tooltip>
          )}
          {!record.emailVerified && !record.adminVerified && (
            <Tag icon={<CloseCircleOutlined />} color="default">Not Verified</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Subscription",
      key: "subscription",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color={record.isPaid ? "gold" : "default"}>
            {record.isPaid ? "PAID" : "FREE"}
          </Tag>
          {record.paidUntil && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Until: {new Date(record.paidUntil).toLocaleDateString()}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete user"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            disabled={record.id === session?.user.id}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={record.id === session?.user.id}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (status === "loading" || !session || session.user.role !== "ADMIN") {
    return (
      <SidebarLayout>
        <Flex align="center" justify="center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <Spin size="large" />
        </Flex>
      </SidebarLayout>
    )
  }

  const filteredUsers = getFilteredUsers()

  return (
    <SidebarLayout>
      <Flex vertical style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 16px', width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Flex vertical>
            <Title level={1}>User Management</Title>
            <Paragraph type="secondary">Manage user accounts and permissions</Paragraph>
          </Flex>

          <Card
            title={
              <Flex justify="space-between" align="center" wrap="wrap" gap="small">
                <Space>
                  <TeamOutlined />
                  User Management
                </Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create User
                </Button>
              </Flex>
            }
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "all",
                  label: (
                    <Space>
                      All Users
                      <Badge count={users.length} showZero style={{ backgroundColor: '#1890ff' }} />
                    </Space>
                  ),
                },
                {
                  key: "paid",
                  label: (
                    <Space>
                      Paid
                      <Badge count={users.filter(u => u.isPaid).length} showZero style={{ backgroundColor: '#faad14' }} />
                    </Space>
                  ),
                },
                {
                  key: "unpaid",
                  label: (
                    <Space>
                      Free
                      <Badge count={users.filter(u => !u.isPaid).length} showZero style={{ backgroundColor: '#d9d9d9' }} />
                    </Space>
                  ),
                },
              ]}
            />

            {/* Search and Filter Controls */}
            <Flex gap="middle" wrap="wrap" style={{ marginTop: 16, width: '100%' }}>
              <Input
                placeholder="Search by name or email..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ flex: '1 1 auto', minWidth: 250, maxWidth: isMobile ? '100%' : 400 }}
              />
              <Select
                placeholder="Filter by role"
                value={roleFilter}
                onChange={setRoleFilter}
                allowClear
                style={{ width: 170 }}
                options={[
                  { label: "All Roles", value: undefined },
                  { label: "Admin", value: "ADMIN" },
                  { label: "User", value: "USER" },
                ]}
              />
              {(searchText || roleFilter) && (
                <Flex align="center" style={{ whiteSpace: 'nowrap' }}>
                  <Text type="secondary">
                    Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                  </Text>
                </Flex>
              )}
            </Flex>

            {/* Desktop View - Table */}
            {!isMobile && (
              <div style={{ overflowX: "auto" }}>
                <Table
                  columns={columns}
                  dataSource={filteredUsers}
                  rowKey="id"
                  loading={isLoading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} users`,
                  }}
                  style={{ marginTop: 16 }}
                  scroll={{ x: 1000 }}
                />
              </div>
            )}

            {/* Mobile View - List */}
            {isMobile && (
              <List
                loading={isLoading}
                dataSource={filteredUsers}
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Total ${total} users`,
                }}
                style={{ marginTop: 16 }}
                renderItem={(user) => (
                  <List.Item
                    actions={[
                      <Button
                        key="edit"
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(user)}
                        size="small"
                      />,
                      <Popconfirm
                        key="delete"
                        title="Delete user"
                        description="Are you sure?"
                        onConfirm={() => handleDelete(user)}
                        disabled={user.id === session?.user.id}
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          disabled={user.id === session?.user.id}
                          size="small"
                        />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge
                          count={user.isPaid ? <CrownOutlined style={{ color: "#faad14" }} /> : 0}
                          offset={[-5, 40]}
                        >
                          <Avatar
                            size={48}
                            src={user.image || undefined}
                            icon={<UserOutlined />}
                          >
                            {!user.image && user.name ? user.name[0].toUpperCase() : null}
                          </Avatar>
                        </Badge>
                      }
                      title={
                        <Flex vertical gap={4}>
                          <Text strong>{user.name || "N/A"}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {user.email}
                          </Text>
                        </Flex>
                      }
                      description={
                        <Space size="small" wrap>
                          <Tag color={user.role === "ADMIN" ? "green" : "blue"}>{user.role}</Tag>
                          <Tag color={user.isPaid ? "gold" : "default"}>
                            {user.isPaid ? "PAID" : "FREE"}
                          </Tag>
                          {user.adminVerified && <Tag color="purple">Admin ✓</Tag>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Space>
      </Flex>

      {/* Create User Modal */}
      <Modal
        title="Create New User"
        open={isCreateModalOpen}
        onOk={handleCreateUser}
        onCancel={() => {
          setIsCreateModalOpen(false)
          createForm.resetFields()
        }}
        okText="Create"
        width={600}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please input the name!" },
              { min: 2, message: "Name must be at least 2 characters!" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="User's full name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please input the email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password (optional)"
            extra="Leave empty if user will use OAuth"
          >
            <Input.Password placeholder="Min 6 characters" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            initialValue="USER"
            rules={[{ required: true, message: "Please select a role!" }]}
          >
            <Select>
              <Select.Option value="USER">USER</Select.Option>
              <Select.Option value="ADMIN">ADMIN</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="adminVerified"
            label="Admin Verified"
            valuePropName="checked"
            initialValue={false}
            extra="Marks user as manually verified by admin"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="paidUntil"
            label="Subscription Expiry"
            extra="Set expiry date to activate subscription. isPaid status is auto-managed based on this date."
          >
            <DatePicker style={{ width: "100%" }} showTime />
          </Form.Item>

          <Form.Item
            name="isPaid"
            label="Paid Status (Auto-managed)"
            valuePropName="checked"
            initialValue={false}
            extra="This is automatically set based on the expiry date above"
          >
            <Switch disabled />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={isEditModalOpen}
        onOk={handleUpdate}
        onCancel={() => {
          setIsEditModalOpen(false)
          setSelectedUser(null)
          editForm.resetFields()
        }}
        okText="Update"
        confirmLoading={isUpdating}
        width={600}
      >
        {selectedUser && (
          <Flex vertical align="center" gap="middle" style={{ marginBottom: 24 }}>
            <Badge
              count={selectedUser.isPaid ? <CrownOutlined style={{ color: "#faad14" }} /> : 0}
              offset={[-10, 70]}
            >
              <Avatar
                size={80}
                src={selectedUser.image || undefined}
                icon={<UserOutlined />}
              >
                {!selectedUser.image && selectedUser.name ? selectedUser.name[0].toUpperCase() : null}
              </Avatar>
            </Badge>
            <Text strong style={{ fontSize: 16 }}>{selectedUser.name}</Text>
            <Text type="secondary">{selectedUser.email}</Text>
            {selectedUser.image && (
              <Popconfirm
                title="Delete Avatar"
                description="Are you sure you want to delete this user's avatar?"
                onConfirm={() => handleDeleteAvatar(selectedUser.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button danger icon={<DeleteFilled />} size="small">
                  Delete Avatar
                </Button>
              </Popconfirm>
            )}
          </Flex>
        )}
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role!" }]}
          >
            <Select>
              <Select.Option value="USER">USER</Select.Option>
              <Select.Option value="ADMIN">ADMIN</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="emailVerified"
            label="Email Verified"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="adminVerified"
            label="Admin Verified"
            valuePropName="checked"
            extra="Manually verify this user as trusted"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="paidUntil"
            label="Subscription Expiry"
            extra="Set expiry date to activate subscription. Clear this to remove subscription."
          >
            <DatePicker
              style={{ width: "100%" }}
              showTime
              onChange={(date) => {
                // Auto-update isPaid based on the selected date
                if (date) {
                  const now = new Date()
                  // dayjs object already has comparison methods
                  const selectedDate = date.valueOf() // Get timestamp
                  const nowTimestamp = now.getTime()
                  editForm.setFieldValue('isPaid', selectedDate > nowTimestamp)
                } else {
                  // If date is cleared, set isPaid to false
                  editForm.setFieldValue('isPaid', false)
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="isPaid"
            label="Paid Status (Auto-managed)"
            valuePropName="checked"
            extra="This is automatically set based on the expiry date above"
          >
            <Switch disabled />
          </Form.Item>
        </Form>
      </Modal>
    </SidebarLayout>
  )
}
