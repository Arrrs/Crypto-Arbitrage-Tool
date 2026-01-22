"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  Table,
  Typography,
  Spin,
  Flex,
  Button,
  Switch,
  Tag,
  Modal,
  Input,
  message,
  Descriptions,
  Timeline,
  Tooltip,
  Grid,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons"
import SidebarLayout from "@/components/sidebar-layout"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import duration from "dayjs/plugin/duration"

dayjs.extend(relativeTime)
dayjs.extend(duration)

const { useBreakpoint } = Grid

const { Title, Text, Paragraph } = Typography

interface CronExecution {
  id: string
  status: "RUNNING" | "SUCCESS" | "FAILURE"
  startedAt: string
  completedAt: string | null
  duration: number | null
  output: string | null
  error: string | null
  recordsAffected: number | null
}

interface CronJob {
  id: string
  name: string
  description: string | null
  schedule: string
  enabled: boolean
  lastRun: string | null
  nextRun: string | null
  createdAt: string
  updatedAt: string
  executions: CronExecution[]
  _count: {
    executions: number
  }
}

export default function CronManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    schedule: "",
    description: "",
  })
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
    fetchJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchJobs = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/cron")
      const token = res.headers.get("x-csrf-token")
      if (token) {
        setCsrfToken(token)
      }
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs)
      }
    } catch (error) {
      console.error("Failed to fetch cron jobs:", error)
      message.error("Failed to load cron jobs")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleJob = async (job: CronJob) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/cron", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          id: job.id,
          enabled: !job.enabled,
          schedule: job.schedule,
          description: job.description,
        }),
      })

      if (res.ok) {
        message.success(`Job ${!job.enabled ? "enabled" : "disabled"}`)
        fetchJobs()
      } else {
        message.error("Failed to update job")
      }
    } catch (error) {
      message.error("Failed to update job")
    }
  }

  const executeJob = async (job: CronJob) => {
    try {
      const headers: Record<string, string> = {}
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch(`/api/admin/cron/${job.id}/execute`, {
        method: "POST",
        headers,
      })

      if (res.ok) {
        message.success(`Job ${job.name} is running...`)
        // Refresh after a delay to show the new execution
        setTimeout(fetchJobs, 2000)
      } else {
        message.error("Failed to execute job")
      }
    } catch (error) {
      message.error("Failed to execute job")
    }
  }

  const openEditModal = (job: CronJob) => {
    setSelectedJob(job)
    setEditForm({
      schedule: job.schedule,
      description: job.description || "",
    })
    setIsEditModalOpen(true)
  }

  const saveJob = async () => {
    if (!selectedJob) return

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken
      }

      const res = await fetch("/api/admin/cron", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          id: selectedJob.id,
          enabled: selectedJob.enabled,
          schedule: editForm.schedule,
          description: editForm.description,
        }),
      })

      if (res.ok) {
        message.success("Job updated successfully")
        setIsEditModalOpen(false)
        fetchJobs()
      } else {
        message.error("Failed to update job")
      }
    } catch (error) {
      message.error("Failed to update job")
    }
  }

  const showExecutionHistory = (job: CronJob) => {
    setSelectedJob(job)
    setIsModalOpen(true)
  }

  const columns: ColumnsType<CronJob> = [
    {
      title: "Job Name",
      dataIndex: "name",
      key: "name",
      width: isMobile ? 140 : undefined,
      fixed: isMobile ? "left" : undefined,
      render: (name: string, record) => (
        <Flex vertical gap={4}>
          <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>
            {isMobile
              ? name.replace(/_/g, " ").substring(0, 15) + (name.length > 15 ? "..." : "")
              : name.replace(/_/g, " ").toUpperCase()
            }
          </Text>
          {record.description && !isMobile && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Schedule",
      dataIndex: "schedule",
      key: "schedule",
      width: isMobile ? 100 : 150,
      render: (schedule: string) => (
        <Tooltip title="Cron Expression">
          <Tag icon={<ClockCircleOutlined />} style={{ fontSize: isMobile ? 10 : 12 }}>
            {isMobile ? schedule.split(" ").slice(0, 2).join(" ") + "..." : schedule}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "enabled",
      key: "enabled",
      width: isMobile ? 60 : 100,
      render: (enabled: boolean, record) => (
        <Switch
          checked={enabled}
          onChange={() => toggleJob(record)}
          size={isMobile ? "small" : "default"}
          checkedChildren={isMobile ? "" : "ON"}
          unCheckedChildren={isMobile ? "" : "OFF"}
        />
      ),
    },
    {
      title: "Last Run",
      dataIndex: "lastRun",
      key: "lastRun",
      width: isMobile ? 90 : 150,
      responsive: ["md"] as any,
      render: (lastRun: string | null) =>
        lastRun ? (
          <Flex vertical gap={2}>
            <Text style={{ fontSize: isMobile ? 11 : 12 }}>
              {dayjs(lastRun).format(isMobile ? "MMM D" : "MMM D, HH:mm")}
            </Text>
            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11 }}>
              {dayjs(lastRun).fromNow()}
            </Text>
          </Flex>
        ) : (
          <Text type="secondary" style={{ fontSize: isMobile ? 11 : 13 }}>Never</Text>
        ),
    },
    {
      title: "Last Status",
      key: "lastStatus",
      width: isMobile ? undefined : 120,
      responsive: ["lg"] as any,
      render: (_, record) => {
        const lastExecution = record.executions[0]
        if (!lastExecution) return <Text type="secondary">No runs</Text>

        return lastExecution.status === "SUCCESS" ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Success
          </Tag>
        ) : lastExecution.status === "FAILURE" ? (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Failed
          </Tag>
        ) : (
          <Tag icon={<ThunderboltOutlined />} color="processing">
            Running
          </Tag>
        )
      },
    },
    {
      title: "Total Runs",
      dataIndex: ["_count", "executions"],
      key: "totalRuns",
      width: 100,
      responsive: ["lg"] as any,
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 80 : 200,
      render: (_, record) => (
        <Flex gap="small" wrap={isMobile}>
          {!isMobile && (
            <Tooltip title="Run Now">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                size="small"
              onClick={() => executeJob(record)}
              disabled={!record.enabled}
            />
          </Tooltip>
          )}
          <Tooltip title={isMobile ? "Details" : "History"}>
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => showExecutionHistory(record)}
            />
          </Tooltip>
          {!isMobile && (
            <Tooltip title="Edit">
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => openEditModal(record)}
              />
            </Tooltip>
          )}
        </Flex>
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
              <ClockCircleOutlined style={{ fontSize: 32, color: "#1890ff" }} />
              <Title level={1} style={{ margin: 0 }}>Cron Jobs</Title>
            </Flex>
            <Paragraph type="secondary">
              Manage scheduled tasks and view execution history
            </Paragraph>
          </Flex>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchJobs}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Flex>

        {isMobile ? (
          // Mobile: Card-based layout
          <Flex vertical gap="middle">
            {jobs.map((job) => {
              const lastExecution = job.executions[0]
              return (
                <Card key={job.id} size="small">
                  <Flex vertical gap="small">
                    <Flex justify="space-between" align="start">
                      <Flex vertical gap={2}>
                        <Text strong style={{ fontSize: 13 }}>
                          {job.name.replace(/_/g, " ").toUpperCase()}
                        </Text>
                        {job.description && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {job.description}
                          </Text>
                        )}
                      </Flex>
                      <Switch
                        checked={job.enabled}
                        onChange={() => toggleJob(job)}
                        size="small"
                      />
                    </Flex>

                    <Flex gap="small" wrap align="center">
                      <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 10 }}>
                        {job.schedule}
                      </Tag>
                      {lastExecution ? (
                        lastExecution.status === "SUCCESS" ? (
                          <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 10 }}>
                            Success
                          </Tag>
                        ) : lastExecution.status === "FAILURE" ? (
                          <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 10 }}>
                            Failed
                          </Tag>
                        ) : (
                          <Tag icon={<ThunderboltOutlined />} color="processing" style={{ fontSize: 10 }}>
                            Running
                          </Tag>
                        )
                      ) : (
                        <Tag style={{ fontSize: 10 }}>No runs</Tag>
                      )}
                    </Flex>

                    <Flex justify="space-between" align="center">
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {job.lastRun ? `Last: ${dayjs(job.lastRun).fromNow()}` : "Never run"}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Runs: {job._count?.executions || 0}
                      </Text>
                    </Flex>

                    <Flex gap="small" wrap>
                      <Tooltip title="Run Now">
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          size="small"
                          onClick={() => executeJob(job)}
                          disabled={!job.enabled}
                          style={{ flex: 1 }}
                        >
                          Run
                        </Button>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <Button
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => openEditModal(job)}
                          style={{ flex: 1 }}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                      <Tooltip title="History">
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          onClick={() => showExecutionHistory(job)}
                          style={{ flex: 1 }}
                        >
                          History
                        </Button>
                      </Tooltip>
                    </Flex>
                  </Flex>
                </Card>
              )
            })}
          </Flex>
        ) : (
          // Desktop: Table layout
          <Card>
            <div style={{ overflowX: "auto" }}>
              <Table
                columns={columns}
                dataSource={jobs}
                rowKey="id"
                pagination={false}
                scroll={{ x: 1000 }}
              />
            </div>
          </Card>
        )}

        {/* Execution History Modal */}
        <Modal
          title={`Execution History: ${selectedJob?.name}`}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>,
          ]}
          width={800}
        >
          {selectedJob && (
            <Timeline
              items={selectedJob.executions.map((execution) => ({
                color:
                  execution.status === "SUCCESS" ? "green" :
                  execution.status === "FAILURE" ? "red" :
                  "blue",
                dot:
                  execution.status === "SUCCESS" ? <CheckCircleOutlined /> :
                  execution.status === "FAILURE" ? <CloseCircleOutlined /> :
                  <ThunderboltOutlined />,
                children: (
                  <Flex vertical gap="small">
                    <Flex justify="space-between">
                      <Text strong>{dayjs(execution.startedAt).format("MMM D, YYYY HH:mm:ss")}</Text>
                      <Tag color={
                        execution.status === "SUCCESS" ? "success" :
                        execution.status === "FAILURE" ? "error" :
                        "processing"
                      }>
                        {execution.status}
                      </Tag>
                    </Flex>
                    {execution.duration && (
                      <Text type="secondary">
                        Duration: {dayjs.duration(execution.duration).format("s[s] SSS[ms]")}
                      </Text>
                    )}
                    {execution.recordsAffected !== null && (
                      <Text type="secondary">
                        Records affected: {execution.recordsAffected}
                      </Text>
                    )}
                    {execution.output && (
                      <Text code style={{ fontSize: 11 }}>
                        {execution.output}
                      </Text>
                    )}
                    {execution.error && (
                      <Text type="danger" code style={{ fontSize: 11 }}>
                        {execution.error}
                      </Text>
                    )}
                  </Flex>
                ),
              }))}
            />
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal
          title={`Edit Job: ${selectedJob?.name}`}
          open={isEditModalOpen}
          onCancel={() => setIsEditModalOpen(false)}
          onOk={saveJob}
        >
          <Flex vertical gap="middle" style={{ marginTop: 16 }}>
            <div>
              <Text strong>Schedule (Cron Expression)</Text>
              <Input
                value={editForm.schedule}
                onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                placeholder="0 0 * * *"
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Format: minute hour day month weekday
              </Text>
            </div>
            <div>
              <Text strong>Description</Text>
              <Input.TextArea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                style={{ marginTop: 8 }}
              />
            </div>
          </Flex>
        </Modal>
      </Flex>
    </SidebarLayout>
  )
}
