"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Flex,
  Input,
  InputRef,
  Popover,
  Space,
  Table,
  Typography,
  Select,
  Button,
  Spin,
  Tag,
  theme,
  Alert,
  Drawer,
  Badge,
  Card,
  Grid,
} from "antd"
import type { TableColumnType, TableProps } from "antd"
import type { FilterDropdownProps } from "antd/es/table/interface"
import {
  SearchOutlined,
  SwapRightOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  SettingOutlined,
} from "@ant-design/icons"
import Highlighter from "react-highlight-words"
import SidebarLayout from "@/components/sidebar-layout"
import NetworkTable from "@/components/arbitrage/NetworkTable"
import PremiumGate from "@/components/arbitrage/PremiumGate"
import {
  SpotDiffData,
  PairsFilterData,
  SpotFilters,
  REFRESH_INTERVALS,
  TOP_ROWS_OPTIONS,
  DIFF_PERCENT_OPTIONS,
  LIFE_TIME_OPTIONS,
} from "@/components/arbitrage/types"

const { Text, Title } = Typography
const { Option } = Select
const { useBreakpoint } = Grid

type DataIndex = keyof SpotDiffData

export default function ArbitrageSpotPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [pairsData, setPairsData] = useState<PairsFilterData>({ exchanges: [], symbols: [] })
  const [diffData, setDiffData] = useState<SpotDiffData[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const [filters, setFilters] = useState<SpotFilters>({
    topRows: "200",
    exchanges: [],
    minDiffPerc: "",
    maxDiffPerc: "",
    symbol: [],
    minLifeTime: "",
    maxLifeTime: "",
  })

  const [refreshInterval, setRefreshInterval] = useState<number>(20000)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const [searchText, setSearchText] = useState("")
  const [searchedColumn, setSearchedColumn] = useState("")
  const searchInput = useRef<InputRef>(null)

  // Count active filters
  const activeFilterCount = [
    filters.exchanges.length > 0,
    filters.symbol.length > 0,
    filters.minDiffPerc !== "",
    filters.maxDiffPerc !== "",
    filters.minLifeTime !== "",
    filters.maxLifeTime !== "",
  ].filter(Boolean).length

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
    }
  }, [session, status, router])

  // Fetch filter data
  const fetchPairsData = useCallback(async () => {
    try {
      const response = await fetch("/api/arbitrage/pairs")
      if (response.status === 403) {
        setHasSubscription(false)
        setLoading(false)
        return
      }
      if (!response.ok) throw new Error("Failed to fetch pairs data")
      const data: PairsFilterData = await response.json()
      setPairsData(data)
      setHasSubscription(true)
    } catch (err) {
      console.error("Error fetching pairs data:", err)
      setError("Failed to load filter options")
    }
  }, [])

  // Fetch diffs data
  const fetchDiffsData = useCallback(async () => {
    if (hasSubscription === false) return

    setDataLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.topRows) params.set("topRows", filters.topRows)
      if (filters.exchanges.length) params.set("exchanges", filters.exchanges.join(","))
      if (filters.minDiffPerc) params.set("minDiffPerc", filters.minDiffPerc)
      if (filters.maxDiffPerc) params.set("maxDiffPerc", filters.maxDiffPerc)
      filters.symbol.forEach((s) => params.append("symbol", s))
      if (filters.minLifeTime) params.set("minLifeTime", filters.minLifeTime)
      if (filters.maxLifeTime) params.set("maxLifeTime", filters.maxLifeTime)

      const response = await fetch(`/api/arbitrage/diffs?${params.toString()}`)
      if (response.status === 403) {
        setHasSubscription(false)
        return
      }
      if (!response.ok) throw new Error("Failed to fetch diffs data")
      const data: SpotDiffData[] = await response.json()
      setDiffData(data)
      setLastUpdated(new Date())
      setError("")
    } catch (err) {
      console.error("Error fetching diffs data:", err)
      setError("Failed to load arbitrage data")
    } finally {
      setDataLoading(false)
      setLoading(false)
    }
  }, [filters, hasSubscription])

  // Initial data load
  useEffect(() => {
    if (status === "loading" || !session) return
    fetchPairsData()
  }, [status, session, fetchPairsData])

  // Fetch diffs after pairs data is loaded
  useEffect(() => {
    if (hasSubscription === true) {
      fetchDiffsData()
    }
  }, [hasSubscription, fetchDiffsData])

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isRefreshing && refreshInterval > 0 && hasSubscription) {
      intervalRef.current = setInterval(fetchDiffsData, refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRefreshing, refreshInterval, fetchDiffsData, hasSubscription])

  const handleFilterChange = (key: keyof SpotFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearch = (
    selectedKeys: string[],
    confirm: FilterDropdownProps["confirm"],
    dataIndex: DataIndex
  ) => {
    confirm()
    setSearchText(selectedKeys[0])
    setSearchedColumn(dataIndex)
  }

  const handleReset = (clearFilters: () => void, confirm: FilterDropdownProps["confirm"]) => {
    clearFilters()
    setSearchText("")
    confirm()
  }

  const clearAllFilters = () => {
    setFilters({
      topRows: "200",
      exchanges: [],
      minDiffPerc: "",
      maxDiffPerc: "",
      symbol: [],
      minLifeTime: "",
      maxLifeTime: "",
    })
  }

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<SpotDiffData> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters, confirm)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? token.colorPrimary : undefined }} />
    ),
    filterDropdownProps: {
      onOpenChange: (visible) => {
        if (visible) {
          setTimeout(() => searchInput.current?.select(), 100)
        }
      },
    },
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes((value as string).toLowerCase()) ||
      false,
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ""}
        />
      ) : (
        text
      ),
  })

  const formatTimeOfLife = (time: string | null): string => {
    if (!time) return "N/A"
    try {
      const targetTime = new Date(time).getTime()
      const currentTime = Date.now()
      const diffInSeconds = Math.max(0, Math.floor((currentTime - targetTime) / 1000))
      const hours = Math.floor(diffInSeconds / 3600)
      const minutes = Math.floor((diffInSeconds % 3600) / 60)
      const seconds = diffInSeconds % 60
      if (hours > 0) return `${hours}h ${minutes}m`
      if (minutes > 0) return `${minutes}m ${seconds}s`
      return `${seconds}s`
    } catch {
      return "N/A"
    }
  }

  // Mobile card renderer
  const renderMobileCard = (record: SpotDiffData) => (
    <Card
      key={record.id}
      size="small"
      style={{ marginBottom: 8 }}
      bodyStyle={{ padding: 12 }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Text strong style={{ fontSize: 16 }}>
          {record.baseasset}/{record.quoteasset}
        </Text>
        <Text
          strong
          style={{
            fontSize: 18,
            color: parseFloat(record.differencepercentage) > 5 ? token.colorSuccess : token.colorPrimary,
          }}
        >
          {parseFloat(record.differencepercentage).toFixed(2)}%
        </Text>
      </Flex>

      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Tag color="blue">{record.firstpairexchange}</Tag>
        <SwapRightOutlined style={{ color: token.colorTextSecondary }} />
        <Tag color="green">{record.secondpairexchange}</Tag>
      </Flex>

      <Flex justify="space-between" style={{ marginBottom: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Price 1:</Text>
        <Text style={{ fontSize: 12 }}>{parseFloat(record.firstpairprice).toFixed(6)}</Text>
      </Flex>

      <Flex justify="space-between" style={{ marginBottom: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Price 2:</Text>
        <Text style={{ fontSize: 12 }}>{parseFloat(record.secondpairprice).toFixed(6)}</Text>
      </Flex>

      <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {formatTimeOfLife(record.timeoflife)}
        </Text>
        <Popover
          content={
            <NetworkTable
              firstexchangenetworks={record.firstexchangenetworks}
              secondexchangenetworks={record.secondexchangenetworks}
              firstpairexchange={record.firstpairexchange}
              secondpairexchange={record.secondpairexchange}
              baseasset={record.baseasset}
              quoteasset={record.quoteasset}
            />
          }
          trigger="click"
          destroyTooltipOnHide
        >
          <Button type="link" size="small" style={{ padding: 0 }}>
            Networks
          </Button>
        </Popover>
      </Flex>
    </Card>
  )

  // Desktop columns
  const columns: TableProps<SpotDiffData>["columns"] = [
    {
      title: "Symbol",
      dataIndex: "symbol",
      key: "symbol",
      align: "center",
      width: 120,
      ...getColumnSearchProps("symbol"),
      render: (_, record) => (
        <Text strong>
          {record.baseasset}/{record.quoteasset}
        </Text>
      ),
    },
    {
      title: "Exchanges",
      dataIndex: "pairkey",
      key: "pairkey",
      align: "center",
      width: 200,
      ...getColumnSearchProps("pairkey"),
      render: (_, record) => (
        <Flex align="center" gap="small" justify="center">
          <Tag color="blue">{record.firstpairexchange}</Tag>
          <SwapRightOutlined />
          <Tag color="green">{record.secondpairexchange}</Tag>
        </Flex>
      ),
    },
    {
      title: "Diff %",
      dataIndex: "differencepercentage",
      key: "differencepercentage",
      align: "right",
      width: 100,
      sorter: (a, b) => parseFloat(b.differencepercentage) - parseFloat(a.differencepercentage),
      defaultSortOrder: "ascend",
      render: (val) => (
        <Text strong style={{ color: parseFloat(val) > 5 ? token.colorSuccess : undefined }}>
          {parseFloat(val).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: "Price 1",
      dataIndex: "firstpairprice",
      key: "firstpairprice",
      align: "right",
      width: 120,
      render: (val) => parseFloat(val).toFixed(8).replace(/\.?0+$/, ""),
    },
    {
      title: "Price 2",
      dataIndex: "secondpairprice",
      key: "secondpairprice",
      align: "right",
      width: 120,
      render: (val) => parseFloat(val).toFixed(8).replace(/\.?0+$/, ""),
    },
    {
      title: "Volume 1",
      dataIndex: "firstpairvolume",
      key: "firstpairvolume",
      align: "right",
      width: 150,
      render: (vol, record) => {
        const volume = parseFloat(vol)
        const price = parseFloat(record.firstpairprice)
        const usdValue = volume * price
        return (
          <Flex vertical align="end">
            <Text>{volume.toLocaleString()}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              (${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </Text>
          </Flex>
        )
      },
    },
    {
      title: "Volume 2",
      dataIndex: "secondpairvolume",
      key: "secondpairvolume",
      align: "right",
      width: 150,
      render: (vol, record) => {
        const volume = parseFloat(vol)
        const price = parseFloat(record.secondpairprice)
        const usdValue = volume * price
        return (
          <Flex vertical align="end">
            <Text>{volume.toLocaleString()}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              (${usdValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </Text>
          </Flex>
        )
      },
    },
    {
      title: "Life",
      dataIndex: "timeoflife",
      key: "timeoflife",
      align: "center",
      width: 80,
      render: (time) => <Text style={{ fontSize: 12 }}>{formatTimeOfLife(time)}</Text>,
    },
    {
      title: "Net",
      dataIndex: "firstexchangenetworks",
      key: "networks",
      align: "center",
      width: 60,
      render: (_, record) => (
        <Popover
          content={
            <NetworkTable
              firstexchangenetworks={record.firstexchangenetworks}
              secondexchangenetworks={record.secondexchangenetworks}
              firstpairexchange={record.firstpairexchange}
              secondpairexchange={record.secondpairexchange}
              baseasset={record.baseasset}
              quoteasset={record.quoteasset}
            />
          }
          trigger="click"
          destroyTooltipOnHide
        >
          <Button type="link" size="small" style={{ padding: 0 }}>
            View
          </Button>
        </Popover>
      ),
    },
  ]

  // Filter drawer content
  const filterContent = (
    <Flex vertical gap="middle">
      <Flex vertical gap={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>Exchanges</Text>
        <Select
          mode="multiple"
          placeholder="All exchanges"
          value={filters.exchanges}
          onChange={(val) => handleFilterChange("exchanges", val)}
          style={{ width: "100%" }}
          maxTagCount={2}
          allowClear
        >
          {pairsData.exchanges.map((exchange) => (
            <Option key={exchange} value={exchange}>{exchange}</Option>
          ))}
        </Select>
      </Flex>

      <Flex vertical gap={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>Symbols</Text>
        <Select
          mode="multiple"
          placeholder="All symbols"
          value={filters.symbol}
          onChange={(val) => handleFilterChange("symbol", val)}
          style={{ width: "100%" }}
          maxTagCount={2}
          allowClear
          showSearch
        >
          {pairsData.symbols.map((symbol) => (
            <Option key={symbol} value={symbol}>{symbol}</Option>
          ))}
        </Select>
      </Flex>

      <Flex gap="small">
        <Flex vertical gap={4} style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Min Diff %</Text>
          <Select
            placeholder="Any"
            value={filters.minDiffPerc || undefined}
            onChange={(val) => handleFilterChange("minDiffPerc", val || "")}
            style={{ width: "100%" }}
            allowClear
          >
            {DIFF_PERCENT_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Flex>

        <Flex vertical gap={4} style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Max Diff %</Text>
          <Select
            placeholder="Any"
            value={filters.maxDiffPerc || undefined}
            onChange={(val) => handleFilterChange("maxDiffPerc", val || "")}
            style={{ width: "100%" }}
            allowClear
          >
            {DIFF_PERCENT_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Flex>
      </Flex>

      <Flex gap="small">
        <Flex vertical gap={4} style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Min Life Time</Text>
          <Select
            placeholder="Any"
            value={filters.minLifeTime || undefined}
            onChange={(val) => handleFilterChange("minLifeTime", val || "")}
            style={{ width: "100%" }}
            allowClear
          >
            {LIFE_TIME_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Flex>

        <Flex vertical gap={4} style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Max Life Time</Text>
          <Select
            placeholder="Any"
            value={filters.maxLifeTime || undefined}
            onChange={(val) => handleFilterChange("maxLifeTime", val || "")}
            style={{ width: "100%" }}
            allowClear
          >
            {LIFE_TIME_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Flex>
      </Flex>

      <Flex vertical gap={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>Rows</Text>
        <Select
          value={filters.topRows}
          onChange={(val) => handleFilterChange("topRows", val)}
          style={{ width: "100%" }}
        >
          {TOP_ROWS_OPTIONS.map((opt) => (
            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
          ))}
        </Select>
      </Flex>

      <Flex gap="small" style={{ marginTop: 8 }}>
        <Button block onClick={clearAllFilters}>Clear All</Button>
        <Button
          type="primary"
          block
          onClick={() => {
            fetchDiffsData()
            if (isMobile) setFilterDrawerOpen(false)
          }}
          loading={dataLoading}
        >
          Apply
        </Button>
      </Flex>
    </Flex>
  )

  // Loading state
  if (status === "loading" || (loading && hasSubscription === null)) {
    return (
      <SidebarLayout>
        <Flex align="center" justify="center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} size="large" />
        </Flex>
      </SidebarLayout>
    )
  }

  // No subscription
  if (hasSubscription === false) {
    return <PremiumGate feature="Arbitrage Spot" />
  }

  return (
    <SidebarLayout>
      <Flex
        vertical
        gap="small"
        style={{ height: "100%", width: "100%", padding: isMobile ? "12px" : "20px 24px" }}
      >
        {/* Header */}
        <Flex justify="space-between" align="center" wrap="wrap" gap="small">
          <Flex vertical>
            <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>
              Arbitrage Spot
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {lastUpdated && `Updated: ${lastUpdated.toLocaleTimeString()}`}
              {dataLoading && " (...)"}
            </Text>
          </Flex>

          {/* Mobile: Compact controls */}
          {isMobile ? (
            <Flex gap="small">
              <Button
                icon={isRefreshing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={() => setIsRefreshing(!isRefreshing)}
                type={isRefreshing ? "primary" : "default"}
                size="small"
              />
              <Button
                icon={<ReloadOutlined spin={dataLoading} />}
                onClick={fetchDiffsData}
                size="small"
                disabled={dataLoading}
              />
              <Badge count={activeFilterCount} size="small">
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterDrawerOpen(true)}
                  size="small"
                />
              </Badge>
            </Flex>
          ) : (
            /* Desktop: Full controls */
            <Flex align="center" gap="small">
              <Select
                value={refreshInterval}
                onChange={setRefreshInterval}
                style={{ width: 110 }}
                size="small"
              >
                {REFRESH_INTERVALS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
              <Button
                type={isRefreshing ? "primary" : "default"}
                icon={isRefreshing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={() => setIsRefreshing(!isRefreshing)}
                size="small"
              >
                {isRefreshing ? "Pause" : "Start"}
              </Button>
              <Button
                icon={<ReloadOutlined spin={dataLoading} />}
                onClick={fetchDiffsData}
                size="small"
                disabled={dataLoading}
              >
                Refresh
              </Button>
            </Flex>
          )}
        </Flex>

        {error && <Alert message={error} type="error" showIcon closable />}

        {/* Mobile: Refresh interval selector in collapsible */}
        {isMobile && (
          <Flex align="center" gap="small" style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Auto:</Text>
            <Select
              value={refreshInterval}
              onChange={setRefreshInterval}
              style={{ flex: 1 }}
              size="small"
            >
              {REFRESH_INTERVALS.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Flex>
        )}

        {/* Desktop: Inline filters */}
        {!isMobile && (
          <Flex gap="middle" wrap="wrap" align="end">
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Exchanges</Text>
              <Select
                mode="multiple"
                placeholder="All exchanges"
                value={filters.exchanges}
                onChange={(val) => handleFilterChange("exchanges", val)}
                style={{ minWidth: 180 }}
                maxTagCount={2}
                allowClear
              >
                {pairsData.exchanges.map((exchange) => (
                  <Option key={exchange} value={exchange}>{exchange}</Option>
                ))}
              </Select>
            </Flex>

            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Symbols</Text>
              <Select
                mode="multiple"
                placeholder="All symbols"
                value={filters.symbol}
                onChange={(val) => handleFilterChange("symbol", val)}
                style={{ minWidth: 180 }}
                maxTagCount={2}
                allowClear
                showSearch
              >
                {pairsData.symbols.map((symbol) => (
                  <Option key={symbol} value={symbol}>{symbol}</Option>
                ))}
              </Select>
            </Flex>

            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Min Diff %</Text>
              <Select
                placeholder="Any"
                value={filters.minDiffPerc || undefined}
                onChange={(val) => handleFilterChange("minDiffPerc", val || "")}
                style={{ width: 100 }}
                allowClear
              >
                {DIFF_PERCENT_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Flex>

            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Max Diff %</Text>
              <Select
                placeholder="Any"
                value={filters.maxDiffPerc || undefined}
                onChange={(val) => handleFilterChange("maxDiffPerc", val || "")}
                style={{ width: 100 }}
                allowClear
              >
                {DIFF_PERCENT_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Flex>

            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Min Life</Text>
              <Select
                placeholder="Any"
                value={filters.minLifeTime || undefined}
                onChange={(val) => handleFilterChange("minLifeTime", val || "")}
                style={{ width: 100 }}
                allowClear
              >
                {LIFE_TIME_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Flex>

            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Max Life</Text>
              <Select
                placeholder="Any"
                value={filters.maxLifeTime || undefined}
                onChange={(val) => handleFilterChange("maxLifeTime", val || "")}
                style={{ width: 100 }}
                allowClear
              >
                {LIFE_TIME_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Flex>

            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>Rows</Text>
              <Select
                value={filters.topRows}
                onChange={(val) => handleFilterChange("topRows", val)}
                style={{ width: 100 }}
              >
                {TOP_ROWS_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Flex>

            <Flex gap="small">
              <Button onClick={clearAllFilters}>Clear</Button>
              <Button
                type="primary"
                onClick={fetchDiffsData}
                loading={dataLoading}
              >
                Apply
              </Button>
            </Flex>
          </Flex>
        )}

        {/* Mobile: Filter drawer */}
        <Drawer
          title="Filters"
          placement="bottom"
          onClose={() => setFilterDrawerOpen(false)}
          open={filterDrawerOpen}
          height="auto"
          styles={{ body: { paddingBottom: 24 } }}
        >
          {filterContent}
        </Drawer>

        {/* Content */}
        {isMobile ? (
          /* Mobile: Card list */
          <Flex
            vertical
            style={{
              flex: 1,
              overflowY: "auto",
              paddingBottom: 16,
            }}
          >
            <Text type="secondary" style={{ fontSize: 11, marginBottom: 8 }}>
              {diffData.length} results
            </Text>
            {loading ? (
              <Flex justify="center" style={{ padding: 40 }}>
                <Spin />
              </Flex>
            ) : (
              diffData.map(renderMobileCard)
            )}
          </Flex>
        ) : (
          /* Desktop: Table */
          <Table
            dataSource={diffData}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1100 }}
            pagination={{
              defaultPageSize: 50,
              showSizeChanger: true,
              pageSizeOptions: ["25", "50", "100", "200"],
              showTotal: (total) => `Total ${total} items`,
            }}
            loading={loading}
          />
        )}
      </Flex>
    </SidebarLayout>
  )
}
