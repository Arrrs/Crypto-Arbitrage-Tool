"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Flex,
  Input,
  InputRef,
  Space,
  Table,
  Typography,
  Select,
  Button,
  Spin,
  Tag,
  Checkbox,
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
  ArrowDownOutlined,
  ArrowUpOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons"
import Highlighter from "react-highlight-words"
import SidebarLayout from "@/components/sidebar-layout"
import PremiumGate from "@/components/arbitrage/PremiumGate"
import {
  FuturesDiffData,
  PairsFilterData,
  FuturesFilters,
  REFRESH_INTERVALS,
  TOP_ROWS_OPTIONS,
} from "@/components/arbitrage/types"

const { Text, Title } = Typography
const { Option } = Select
const { useBreakpoint } = Grid

type DataIndex = keyof FuturesDiffData

export default function ArbitrageFuturesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [pairsData, setPairsData] = useState<PairsFilterData>({
    exchanges: [],
    symbols: [],
    coins: [],
  })
  const [diffData, setDiffData] = useState<FuturesDiffData[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const [filters, setFilters] = useState<FuturesFilters>({
    topRows: "200",
    exchanges: [],
    symbol: [],
    coins: [],
    opposite: false,
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
    filters.coins.length > 0,
    filters.opposite,
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
      const response = await fetch("/api/arbitrage/pairs-futures")
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
      filters.symbol.forEach((s) => params.append("symbol", s))
      if (filters.coins.length) params.set("coins", filters.coins.join(","))
      if (filters.opposite) params.set("opposite", "true")

      const response = await fetch(`/api/arbitrage/diffs-futures?${params.toString()}`)
      if (response.status === 403) {
        setHasSubscription(false)
        return
      }
      if (!response.ok) throw new Error("Failed to fetch diffs data")
      const data: FuturesDiffData[] = await response.json()
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

  const handleFilterChange = (key: keyof FuturesFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      topRows: "200",
      exchanges: [],
      symbol: [],
      coins: [],
      opposite: false,
    })
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

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<FuturesDiffData> => ({
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

  const formatFundingRate = (rate: number): string => {
    return (rate * 100).toFixed(4) + "%"
  }

  // Mobile card renderer
  const renderMobileCard = (record: FuturesDiffData) => (
    <Card
      key={record.pairkey}
      size="small"
      style={{ marginBottom: 8 }}
      bodyStyle={{ padding: 12 }}
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Text strong style={{ fontSize: 16 }}>{record.symbol}</Text>
        <Text
          strong
          style={{
            fontSize: 16,
            color: record.differencefundingratepercent > 0.001 ? token.colorSuccess : token.colorPrimary,
          }}
        >
          {(record.differencefundingratepercent * 100).toFixed(4)}%
        </Text>
      </Flex>

      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Flex align="center" gap={4}>
          {record.firstpairfundingrate > 0 ? (
            <ArrowDownOutlined style={{ color: token.colorError, fontSize: 10 }} />
          ) : record.firstpairfundingrate < 0 ? (
            <ArrowUpOutlined style={{ color: token.colorSuccess, fontSize: 10 }} />
          ) : null}
          <Tag color="blue">{record.firstpairexchange}</Tag>
        </Flex>
        <Text type="secondary">-</Text>
        <Flex align="center" gap={4}>
          <Tag color="green">{record.secondpairexchange}</Tag>
          {record.secondpairfundingrate > 0 ? (
            <ArrowDownOutlined style={{ color: token.colorError, fontSize: 10 }} />
          ) : record.secondpairfundingrate < 0 ? (
            <ArrowUpOutlined style={{ color: token.colorSuccess, fontSize: 10 }} />
          ) : null}
        </Flex>
      </Flex>

      <Flex justify="space-between" style={{ marginBottom: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Funding:</Text>
        <Text style={{ fontSize: 12 }}>
          {formatFundingRate(record.firstpairfundingrate)} / {formatFundingRate(record.secondpairfundingrate)}
        </Text>
      </Flex>

      <Flex justify="space-between" style={{ marginBottom: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Mark:</Text>
        <Text style={{ fontSize: 12 }}>
          {Number(record.firstpairmarkprice).toFixed(4)} / {Number(record.secondpairmarkprice).toFixed(4)}
        </Text>
      </Flex>

      <Flex justify="space-between">
        <Text type="secondary" style={{ fontSize: 12 }}>Vol:</Text>
        <Text style={{ fontSize: 12 }}>
          {Number(record.firstpairvolume).toLocaleString(undefined, { maximumFractionDigits: 0 })} / {Number(record.secondpairvolume).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </Text>
      </Flex>
    </Card>
  )

  // Desktop columns
  const columns: TableProps<FuturesDiffData>["columns"] = [
    {
      title: "Symbol",
      dataIndex: "symbol",
      key: "symbol",
      align: "center",
      width: 100,
      fixed: "left",
      ...getColumnSearchProps("symbol"),
      render: (symbol) => <Text strong>{symbol}</Text>,
    },
    {
      title: "Exchanges",
      dataIndex: "pairkey",
      key: "pairkey",
      align: "center",
      width: 200,
      render: (_, record) => (
        <Flex align="center" gap="small" justify="center">
          {record.firstpairfundingrate > 0 ? (
            <ArrowDownOutlined style={{ color: token.colorError }} />
          ) : record.firstpairfundingrate < 0 ? (
            <ArrowUpOutlined style={{ color: token.colorSuccess }} />
          ) : null}
          <Tag color="blue">{record.firstpairexchange}</Tag>
          <Text>-</Text>
          <Tag color="green">{record.secondpairexchange}</Tag>
          {record.secondpairfundingrate > 0 ? (
            <ArrowDownOutlined style={{ color: token.colorError }} />
          ) : record.secondpairfundingrate < 0 ? (
            <ArrowUpOutlined style={{ color: token.colorSuccess }} />
          ) : null}
        </Flex>
      ),
    },
    {
      title: "Funding Rate",
      dataIndex: "firstpairfundingrate",
      key: "fundingrates",
      align: "center",
      width: 160,
      render: (_, record) => (
        <Text style={{ fontSize: 12 }}>
          {formatFundingRate(record.firstpairfundingrate)} / {formatFundingRate(record.secondpairfundingrate)}
        </Text>
      ),
    },
    {
      title: "Funding Diff",
      dataIndex: "differencefundingratepercent",
      key: "differencefundingratepercent",
      align: "center",
      width: 110,
      sorter: (a, b) => b.differencefundingratepercent - a.differencefundingratepercent,
      defaultSortOrder: "ascend",
      render: (val) => (
        <Text strong style={{ color: val > 0.001 ? token.colorSuccess : undefined }}>
          {(val * 100).toFixed(4)}%
        </Text>
      ),
    },
    {
      title: "Mark Price",
      dataIndex: "firstpairmarkprice",
      key: "markprice",
      align: "center",
      width: 160,
      render: (_, record) => (
        <Text style={{ fontSize: 12 }}>
          {Number(record.firstpairmarkprice).toFixed(4)} / {Number(record.secondpairmarkprice).toFixed(4)}
        </Text>
      ),
    },
    {
      title: "Diff M/I %",
      dataIndex: "differencemarkpercentage",
      key: "diffpercent",
      align: "right",
      width: 120,
      sorter: (a, b) => b.differencemarkpercentage - a.differencemarkpercentage,
      render: (_, record) => (
        <Text style={{ fontSize: 12 }}>
          {Number(record.differencemarkpercentage).toFixed(2)}% / {Number(record.differenceindexpercentage).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: "Vol 1",
      dataIndex: "firstpairvolume",
      key: "firstpairvolume",
      align: "right",
      width: 100,
      render: (vol) => <Text style={{ fontSize: 12 }}>{Number(vol).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>,
    },
    {
      title: "Vol 2",
      dataIndex: "secondpairvolume",
      key: "secondpairvolume",
      align: "right",
      width: 100,
      render: (vol) => <Text style={{ fontSize: 12 }}>{Number(vol).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>,
    },
  ]

  // Filter content
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

      <Flex vertical gap={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>Coins</Text>
        <Select
          mode="multiple"
          placeholder="All coins"
          value={filters.coins}
          onChange={(val) => handleFilterChange("coins", val)}
          style={{ width: "100%" }}
          maxTagCount={2}
          allowClear
          showSearch
        >
          {pairsData.coins?.map((coin) => (
            <Option key={coin} value={coin}>{coin}</Option>
          ))}
        </Select>
      </Flex>

      <Flex gap="small">
        <Flex vertical gap={4} style={{ flex: 1 }}>
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

        <Flex vertical gap={4} style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Options</Text>
          <Checkbox
            checked={filters.opposite}
            onChange={(e) => handleFilterChange("opposite", e.target.checked)}
          >
            Opposite only
          </Checkbox>
        </Flex>
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
    return <PremiumGate feature="Arbitrage Futures" />
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
              Arbitrage Futures
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

        {/* Mobile: Refresh interval selector */}
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
              <Text type="secondary" style={{ fontSize: 12 }}>Coins</Text>
              <Select
                mode="multiple"
                placeholder="All coins"
                value={filters.coins}
                onChange={(val) => handleFilterChange("coins", val)}
                style={{ minWidth: 150 }}
                maxTagCount={2}
                allowClear
                showSearch
              >
                {pairsData.coins?.map((coin) => (
                  <Option key={coin} value={coin}>{coin}</Option>
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

            <Flex vertical gap={4} justify="end">
              <Checkbox
                checked={filters.opposite}
                onChange={(e) => handleFilterChange("opposite", e.target.checked)}
              >
                Opposite only
              </Checkbox>
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
            rowKey="pairkey"
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
