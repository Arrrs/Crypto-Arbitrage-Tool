"use client"

import { Spin, Flex, theme } from "antd"
import { LoadingOutlined } from "@ant-design/icons"

export default function Loading() {
  const { token } = theme.useToken()

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        width: "100%",
        background: token.colorBgContainer,
      }}
    >
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 48, color: token.colorPrimary }} spin />}
        size="large"
      />
    </Flex>
  )
}
