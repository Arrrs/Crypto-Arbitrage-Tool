"use client"

import { SessionProvider } from "next-auth/react"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import { ConfigProvider, theme, App } from "antd"
import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { SessionWatcher } from "@/components/session-watcher"

function AntdConfigProvider({ children }: { children: React.ReactNode }) {
  const { theme: appTheme } = useTheme()
  const { defaultAlgorithm, darkAlgorithm } = theme

  return (
    <ConfigProvider
      theme={{
        algorithm: appTheme === "dark" ? darkAlgorithm : defaultAlgorithm,
        token: {
          colorPrimary: "#1890ff",
          borderRadius: 6,
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Check session every 60 seconds in dev (allows time for testing), 5 minutes in production
      refetchInterval={process.env.NODE_ENV === "development" ? 60 : 5 * 60}
      refetchOnWindowFocus={true} // Refetch when window regains focus
    >
      <SessionWatcher />
      <AntdRegistry>
        <ThemeProvider>
          <AntdConfigProvider>{children}</AntdConfigProvider>
        </ThemeProvider>
      </AntdRegistry>
    </SessionProvider>
  )
}
