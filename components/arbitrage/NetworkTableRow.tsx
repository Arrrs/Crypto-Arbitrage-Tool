"use client"

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons"
import { Flex, Tooltip, Typography } from "antd"

const { Text } = Typography

interface NetworkTableRowProps {
  data: {
    coin: string
    network: string
    exchange: string
    networkName: string
    depositEnable: boolean
    withdrawEnable: boolean
    updatedAt: string
  }
}

function getTimeAgo(time: string | null): string {
  if (!time) return "N/A"

  try {
    const targetTime = new Date(time.endsWith("Z") ? time : time + "Z").getTime()
    const currentTime = Date.now()
    const diffInSeconds = Math.max(0, Math.floor((currentTime - targetTime) / 1000))

    const hours = Math.floor(diffInSeconds / 3600)
    const minutes = Math.floor((diffInSeconds % 3600) / 60)
    const seconds = diffInSeconds % 60

    return `${hours}h ${minutes}m ${seconds}s ago`
  } catch {
    return "Invalid Time"
  }
}

export default function NetworkTableRow({ data }: NetworkTableRowProps) {
  const { network, networkName, depositEnable, withdrawEnable, updatedAt } = data

  return (
    <Flex
      key={network + networkName}
      justify="space-between"
      align="center"
      gap={10}
      style={{ padding: "4px 0" }}
    >
      <Tooltip title={getTimeAgo(updatedAt)} placement="left" destroyTooltipOnHide>
        <Text style={{ cursor: "pointer" }}>{network || networkName}</Text>
      </Tooltip>
      <Flex gap={4}>
        <Tooltip title={withdrawEnable ? "Withdraw enabled" : "Withdraw disabled"}>
          <ArrowUpOutlined style={{ color: withdrawEnable ? "#52c41a" : "#ff4d4f" }} />
        </Tooltip>
        <Tooltip title={depositEnable ? "Deposit enabled" : "Deposit disabled"}>
          <ArrowDownOutlined style={{ color: depositEnable ? "#52c41a" : "#ff4d4f" }} />
        </Tooltip>
      </Flex>
    </Flex>
  )
}
