"use client"

import { Card, Flex, Typography, Table, Tag, Tooltip, theme } from "antd"
import { ArrowDownOutlined, ArrowUpOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons"
import type { TableProps } from "antd"

const { Text } = Typography

interface NetworkEntry {
  coin: string
  network: string
  exchange: string
  networkName: string
  depositEnable: boolean
  withdrawEnable: boolean
  updatedAt: string
}

interface ExchangeNetworks {
  baseAsset?: NetworkEntry[]
  quoteAsset?: NetworkEntry[]
}

interface NetworkTableProps {
  firstexchangenetworks: string | object | null
  secondexchangenetworks: string | object | null
  firstpairexchange: string
  secondpairexchange: string
  baseasset: string
  quoteasset: string
}

function parseNetworks(data: string | object | null): ExchangeNetworks | null {
  if (!data) return null
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return data as ExchangeNetworks
}

function getTimeAgo(time: string | null): string {
  if (!time) return "N/A"
  try {
    const targetTime = new Date(time.endsWith("Z") ? time : time + "Z").getTime()
    const currentTime = Date.now()
    const diffInSeconds = Math.max(0, Math.floor((currentTime - targetTime) / 1000))
    const hours = Math.floor(diffInSeconds / 3600)
    const minutes = Math.floor((diffInSeconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  } catch {
    return "N/A"
  }
}

interface NetworkRowData {
  key: string
  network: string
  networkName: string
  exchange1Deposit: boolean | null
  exchange1Withdraw: boolean | null
  exchange1Updated: string | null
  exchange2Deposit: boolean | null
  exchange2Withdraw: boolean | null
  exchange2Updated: string | null
}

function mergeNetworks(
  first: NetworkEntry[] | undefined,
  second: NetworkEntry[] | undefined
): NetworkRowData[] {
  const networkMap = new Map<string, NetworkRowData>()

  // Add first exchange networks
  first?.forEach((n) => {
    const key = n.network || n.networkName
    networkMap.set(key, {
      key,
      network: n.network,
      networkName: n.networkName,
      exchange1Deposit: n.depositEnable,
      exchange1Withdraw: n.withdrawEnable,
      exchange1Updated: n.updatedAt,
      exchange2Deposit: null,
      exchange2Withdraw: null,
      exchange2Updated: null,
    })
  })

  // Add/merge second exchange networks
  second?.forEach((n) => {
    const key = n.network || n.networkName
    const existing = networkMap.get(key)
    if (existing) {
      existing.exchange2Deposit = n.depositEnable
      existing.exchange2Withdraw = n.withdrawEnable
      existing.exchange2Updated = n.updatedAt
    } else {
      networkMap.set(key, {
        key,
        network: n.network,
        networkName: n.networkName,
        exchange1Deposit: null,
        exchange1Withdraw: null,
        exchange1Updated: null,
        exchange2Deposit: n.depositEnable,
        exchange2Withdraw: n.withdrawEnable,
        exchange2Updated: n.updatedAt,
      })
    }
  })

  return Array.from(networkMap.values()).sort((a, b) => a.key.localeCompare(b.key))
}

function StatusIcon({ enabled, updated }: { enabled: boolean | null; updated: string | null }) {
  const { token } = theme.useToken()

  if (enabled === null) {
    return <Text type="secondary">-</Text>
  }

  return (
    <Tooltip title={updated ? getTimeAgo(updated) : undefined}>
      {enabled ? (
        <CheckCircleOutlined style={{ color: token.colorSuccess }} />
      ) : (
        <CloseCircleOutlined style={{ color: token.colorError }} />
      )}
    </Tooltip>
  )
}

function NetworkSection({
  title,
  data,
  exchange1,
  exchange2,
}: {
  title: string
  data: NetworkRowData[]
  exchange1: string
  exchange2: string
}) {
  const { token } = theme.useToken()

  const columns: TableProps<NetworkRowData>["columns"] = [
    {
      title: "Network",
      dataIndex: "network",
      key: "network",
      width: 100,
      ellipsis: true,
      render: (network, record) => (
        <Tooltip title={record.networkName}>
          <Text style={{ fontSize: 12 }}>{network || record.networkName}</Text>
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title={`${exchange1} - Withdraw / Deposit`}>
          <Text style={{ fontSize: 11 }}>{exchange1.substring(0, 8)}</Text>
        </Tooltip>
      ),
      key: "exchange1",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Flex justify="center" gap={4}>
          <Tooltip title="Withdraw">
            <span>
              <ArrowUpOutlined
                style={{
                  color:
                    record.exchange1Withdraw === null
                      ? token.colorTextDisabled
                      : record.exchange1Withdraw
                      ? token.colorSuccess
                      : token.colorError,
                  fontSize: 12,
                }}
              />
            </span>
          </Tooltip>
          <Tooltip title="Deposit">
            <span>
              <ArrowDownOutlined
                style={{
                  color:
                    record.exchange1Deposit === null
                      ? token.colorTextDisabled
                      : record.exchange1Deposit
                      ? token.colorSuccess
                      : token.colorError,
                  fontSize: 12,
                }}
              />
            </span>
          </Tooltip>
        </Flex>
      ),
    },
    {
      title: (
        <Tooltip title={`${exchange2} - Withdraw / Deposit`}>
          <Text style={{ fontSize: 11 }}>{exchange2.substring(0, 8)}</Text>
        </Tooltip>
      ),
      key: "exchange2",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Flex justify="center" gap={4}>
          <Tooltip title="Withdraw">
            <span>
              <ArrowUpOutlined
                style={{
                  color:
                    record.exchange2Withdraw === null
                      ? token.colorTextDisabled
                      : record.exchange2Withdraw
                      ? token.colorSuccess
                      : token.colorError,
                  fontSize: 12,
                }}
              />
            </span>
          </Tooltip>
          <Tooltip title="Deposit">
            <span>
              <ArrowDownOutlined
                style={{
                  color:
                    record.exchange2Deposit === null
                      ? token.colorTextDisabled
                      : record.exchange2Deposit
                      ? token.colorSuccess
                      : token.colorError,
                  fontSize: 12,
                }}
              />
            </span>
          </Tooltip>
        </Flex>
      ),
    },
  ]

  if (data.length === 0) {
    return (
      <Card size="small" title={<Text strong>{title}</Text>} style={{ marginBottom: 8 }}>
        <Text type="secondary">No networks available</Text>
      </Card>
    )
  }

  return (
    <Card size="small" title={<Text strong>{title}</Text>} style={{ marginBottom: 8 }} bodyStyle={{ padding: 0 }}>
      <Table
        dataSource={data}
        columns={columns}
        size="small"
        pagination={false}
        scroll={{ y: data.length > 6 ? 200 : undefined }}
        rowKey="key"
        style={{ fontSize: 12 }}
      />
    </Card>
  )
}

export default function NetworkTable({
  firstexchangenetworks,
  secondexchangenetworks,
  firstpairexchange,
  secondpairexchange,
  baseasset,
  quoteasset,
}: NetworkTableProps) {
  const firstNetworks = parseNetworks(firstexchangenetworks)
  const secondNetworks = parseNetworks(secondexchangenetworks)

  const baseAssetData = mergeNetworks(firstNetworks?.baseAsset, secondNetworks?.baseAsset)
  const quoteAssetData = mergeNetworks(firstNetworks?.quoteAsset, secondNetworks?.quoteAsset)

  return (
    <Flex vertical style={{ width: 320, maxHeight: 500 }}>
      <Flex justify="space-around" style={{ marginBottom: 8, padding: "8px 0" }}>
        <Tag color="blue">{firstpairexchange}</Tag>
        <Text type="secondary">vs</Text>
        <Tag color="green">{secondpairexchange}</Tag>
      </Flex>

      <Flex vertical style={{ overflowY: "auto", maxHeight: 440 }}>
        <NetworkSection
          title={baseasset}
          data={baseAssetData}
          exchange1={firstpairexchange}
          exchange2={secondpairexchange}
        />
        <NetworkSection
          title={quoteasset}
          data={quoteAssetData}
          exchange1={firstpairexchange}
          exchange2={secondpairexchange}
        />
      </Flex>

      <Flex justify="center" style={{ marginTop: 8, padding: "4px 0" }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          <ArrowUpOutlined /> Withdraw &nbsp; <ArrowDownOutlined /> Deposit
        </Text>
      </Flex>
    </Flex>
  )
}
