import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Types for spot arbitrage
export interface SpotDiff {
  id: number
  pairkey: string
  symbol: string
  baseasset: string
  quoteasset: string
  firstpairexchange: string
  firstpairmarket: string
  firstpairprice: string
  firstpairvolume: string
  secondpairexchange: string
  secondpairmarket: string
  secondpairprice: string
  secondpairvolume: string
  difference: string
  differencepercentage: string
  firstexchangenetworks: object | null
  secondexchangenetworks: object | null
  timeoflife: Date | null
  timeelapsed: string
  updatedat: Date
  createdat: Date
}

export interface FuturesDiff {
  id: number
  pairkey: string
  symbol: string
  baseasset: string
  quoteasset: string
  firstpairexchange: string
  firstpairmarket: string
  firstpairmarkprice: string
  firstpairindexprice: string
  firstpairvolume: string
  firstpairfundingrate: string
  secondpairexchange: string
  secondpairmarket: string
  secondpairmarkprice: string
  secondpairindexprice: string
  secondpairvolume: string
  secondpairfundingrate: string
  differencemark: string
  differenceindex: string
  differencemarkpercentage: string
  differenceindexpercentage: string
  differencefundingratepercent: string
  isfundingrateopposite: boolean
  firstexchangenetworks: object | null
  secondexchangenetworks: object | null
  timeoflife: Date | null
  timeelapsed: string
  updatedat: Date
  createdat: Date
}

export interface PairsFilterData {
  exchanges: string[]
  symbols: string[]
  coins?: string[]
}

export interface SpotDiffsParams {
  topRows?: string
  exchanges?: string[]
  minDiffPerc?: string
  maxDiffPerc?: string
  symbols?: string[]
  minLifeTime?: string
  maxLifeTime?: string
}

export interface FuturesDiffsParams {
  topRows?: string
  exchanges?: string[]
  symbols?: string[]
  coins?: string[]
  opposite?: boolean
}

// Whitelist of valid exchanges to prevent injection
const VALID_EXCHANGES = [
  "Binance",
  "Bybit",
  "OKX",
  "Gate.io",
  "Bitget",
  "MEXC",
  "KuCoin",
  "Huobi",
  "Kraken",
  "Coinbase",
  "WhiteBIT",
  "BingX",
  "Phemex",
  "dYdX",
  "Vertex",
  "Hyperliquid",
] as const

// Whitelist of valid time intervals
const VALID_INTERVALS = [
  "1 second",
  "5 seconds",
  "10 seconds",
  "30 seconds",
  "1 minute",
  "2 minutes",
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "30 minutes",
  "1 hour",
  "2 hours",
  "4 hours",
  "8 hours",
  "12 hours",
  "24 hours",
  "1 day",
  "2 days",
  "7 days",
] as const

/**
 * Validate and sanitize exchange names against whitelist
 */
function validateExchanges(exchanges: string[]): string[] {
  return exchanges.filter((e) => VALID_EXCHANGES.includes(e as any))
}

/**
 * Validate interval string against whitelist
 */
function validateInterval(interval: string): string | null {
  const normalized = interval.toLowerCase().trim()
  const valid = VALID_INTERVALS.find((v) => v.toLowerCase() === normalized)
  return valid || null
}

/**
 * Validate and sanitize symbol (alphanumeric, /, -, _ only)
 */
function validateSymbol(symbol: string): string | null {
  // Symbol should only contain alphanumeric chars, /, -, _
  const sanitized = symbol.replace(/[^a-zA-Z0-9/_-]/g, "")
  if (sanitized.length > 0 && sanitized.length <= 20) {
    return sanitized
  }
  return null
}

/**
 * Validate and sanitize coin/asset name (alphanumeric only)
 */
function validateCoin(coin: string): string | null {
  const sanitized = coin.replace(/[^a-zA-Z0-9]/g, "")
  if (sanitized.length > 0 && sanitized.length <= 10) {
    return sanitized
  }
  return null
}

/**
 * Validate numeric value and clamp to safe range
 */
function validateNumber(value: string, min: number, max: number): number | null {
  const num = parseFloat(value)
  if (isNaN(num)) return null
  return Math.max(min, Math.min(max, num))
}

/**
 * Validate limit value
 */
function validateLimit(value: string): number {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 1) return 500
  return Math.min(num, 10000) // Max 10000 rows
}

/**
 * Get unique exchanges and symbols for spot pairs filter dropdowns
 */
export async function getSpotPairsFilterData(): Promise<PairsFilterData> {
  const [exchangesResult, symbolsResult] = await Promise.all([
    prisma.$queryRaw<{ exchange: string }[]>`SELECT DISTINCT exchange FROM pairs ORDER BY exchange`,
    prisma.$queryRaw<{ symbol: string }[]>`SELECT DISTINCT symbol FROM pairs ORDER BY symbol`,
  ])

  return {
    exchanges: exchangesResult.map((r) => r.exchange),
    symbols: symbolsResult.map((r) => r.symbol),
  }
}

/**
 * Get unique exchanges, symbols and coins for futures pairs filter dropdowns
 */
export async function getFuturesPairsFilterData(): Promise<PairsFilterData> {
  const [exchangesResult, symbolsResult, coinsResult] = await Promise.all([
    prisma.$queryRaw<{ exchange: string }[]>`SELECT DISTINCT exchange FROM pairsfutures ORDER BY exchange`,
    prisma.$queryRaw<{ symbol: string }[]>`SELECT DISTINCT symbol FROM pairsfutures ORDER BY symbol`,
    prisma.$queryRaw<{ asset: string }[]>`
      SELECT DISTINCT asset FROM (
        SELECT baseasset AS asset FROM pairsfutures
        UNION
        SELECT quoteasset AS asset FROM pairsfutures
      ) AS combinedAssets
      ORDER BY asset
    `,
  ])

  return {
    exchanges: exchangesResult.map((r) => r.exchange),
    symbols: symbolsResult.map((r) => r.symbol),
    coins: coinsResult.map((r) => r.asset),
  }
}

/**
 * Get spot diffs with filtering - using parameterized queries for security
 */
export async function getSpotDiffs(params: SpotDiffsParams): Promise<SpotDiff[]> {
  const { topRows, exchanges, minDiffPerc, maxDiffPerc, symbols, minLifeTime, maxLifeTime } = params

  // Build conditions array for Prisma.sql
  const conditions: Prisma.Sql[] = []

  // Filter by exchanges (validated against whitelist)
  if (exchanges && exchanges.length > 0 && exchanges[0] !== "") {
    const validExchanges = validateExchanges(exchanges)
    if (validExchanges.length > 0) {
      conditions.push(
        Prisma.sql`firstpairexchange = ANY(${validExchanges})`
      )
      conditions.push(
        Prisma.sql`secondpairexchange = ANY(${validExchanges})`
      )
    }
  }

  // Filter by difference percentage (validated numbers)
  if (minDiffPerc && minDiffPerc !== "0" && minDiffPerc !== "undefined") {
    const minVal = validateNumber(minDiffPerc, 0, 100000)
    if (minVal !== null) {
      conditions.push(Prisma.sql`differencepercentage >= ${minVal}`)
    }
  }
  if (maxDiffPerc && maxDiffPerc !== "0" && maxDiffPerc !== "undefined") {
    const maxVal = validateNumber(maxDiffPerc, 0, 100000)
    if (maxVal !== null) {
      conditions.push(Prisma.sql`differencepercentage <= ${maxVal}`)
    }
  }

  // Filter by symbols (validated and sanitized)
  if (symbols && symbols.length > 0 && symbols[0] !== "") {
    const validSymbols = symbols.map(validateSymbol).filter((s): s is string => s !== null)
    if (validSymbols.length > 0) {
      conditions.push(Prisma.sql`symbol = ANY(${validSymbols})`)
    }
  }

  // Filter by life time (validated against whitelist)
  if (minLifeTime && minLifeTime !== "undefined") {
    const validInterval = validateInterval(minLifeTime)
    if (validInterval) {
      conditions.push(Prisma.sql`timeelapsed >= ${validInterval}::interval`)
    }
  }
  if (maxLifeTime && maxLifeTime !== "undefined") {
    const validInterval = validateInterval(maxLifeTime)
    if (validInterval) {
      conditions.push(Prisma.sql`timeelapsed <= ${validInterval}::interval`)
    }
  }

  // Exclude zero volume and extreme differences
  conditions.push(Prisma.sql`firstpairvolume <> 0`)
  conditions.push(Prisma.sql`secondpairvolume <> 0`)
  conditions.push(Prisma.sql`differencepercentage < 100000`)

  // Combine conditions with AND
  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.sql``

  // Determine limit (validated)
  let limitValue = 500
  if (topRows && topRows.toLowerCase() !== "all" && topRows !== "undefined") {
    limitValue = validateLimit(topRows)
  }
  const useLimit = topRows?.toLowerCase() !== "all"

  // Build and execute the query with parameterized values
  const query = useLimit
    ? Prisma.sql`
        SELECT
          id, pairkey, symbol, baseasset, quoteasset,
          firstpairexchange, firstpairmarket, firstpairprice, firstpairvolume,
          secondpairexchange, secondpairmarket, secondpairprice, secondpairvolume,
          difference, differencepercentage,
          firstexchangenetworks, secondexchangenetworks,
          timeoflife,
          timeelapsed::text as timeelapsed,
          updatedat, createdat
        FROM diffs
        ${whereClause}
        ORDER BY differencepercentage DESC
        LIMIT ${limitValue}
      `
    : Prisma.sql`
        SELECT
          id, pairkey, symbol, baseasset, quoteasset,
          firstpairexchange, firstpairmarket, firstpairprice, firstpairvolume,
          secondpairexchange, secondpairmarket, secondpairprice, secondpairvolume,
          difference, differencepercentage,
          firstexchangenetworks, secondexchangenetworks,
          timeoflife,
          timeelapsed::text as timeelapsed,
          updatedat, createdat
        FROM diffs
        ${whereClause}
        ORDER BY differencepercentage DESC
      `

  const results = await prisma.$queryRaw<SpotDiff[]>(query)
  return results
}

/**
 * Get futures diffs with filtering - using parameterized queries for security
 */
export async function getFuturesDiffs(params: FuturesDiffsParams): Promise<FuturesDiff[]> {
  const { topRows, exchanges, symbols, coins, opposite } = params

  // Build conditions array for Prisma.sql
  const conditions: Prisma.Sql[] = []

  // Filter by exchanges (validated against whitelist)
  if (exchanges && exchanges.length > 0 && exchanges[0] !== "") {
    const validExchanges = validateExchanges(exchanges)
    if (validExchanges.length > 0) {
      conditions.push(
        Prisma.sql`firstpairexchange = ANY(${validExchanges})`
      )
      conditions.push(
        Prisma.sql`secondpairexchange = ANY(${validExchanges})`
      )
    }
  }

  // Filter by symbols (validated and sanitized)
  if (symbols && symbols.length > 0 && symbols[0] !== "") {
    const validSymbols = symbols.map(validateSymbol).filter((s): s is string => s !== null)
    if (validSymbols.length > 0) {
      conditions.push(Prisma.sql`symbol = ANY(${validSymbols})`)
    }
  }

  // Filter by opposite funding rate
  if (opposite) {
    conditions.push(Prisma.sql`isfundingrateopposite = true`)
  }

  // Filter by coins (validated and sanitized)
  if (coins && coins.length > 0 && coins[0] !== "") {
    const validCoins = coins.map(validateCoin).filter((c): c is string => c !== null)
    if (validCoins.length > 0) {
      // Use OR condition for base or quote asset matching any of the coins
      const coinConditions = validCoins.map(
        (coin) => Prisma.sql`(baseasset = ${coin} OR quoteasset = ${coin})`
      )
      conditions.push(Prisma.sql`(${Prisma.join(coinConditions, " OR ")})`)
    }
  }

  // Exclude zero volume
  conditions.push(Prisma.sql`firstpairvolume <> 0`)
  conditions.push(Prisma.sql`secondpairvolume <> 0`)

  // Combine conditions with AND
  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.sql``

  // Determine limit (validated)
  let limitValue = 500
  if (topRows && topRows.toLowerCase() !== "all" && topRows !== "undefined") {
    limitValue = validateLimit(topRows)
  }
  const useLimit = topRows?.toLowerCase() !== "all"

  // Build and execute the query with parameterized values
  const query = useLimit
    ? Prisma.sql`
        SELECT
          id, pairkey, symbol, baseasset, quoteasset,
          firstpairexchange, firstpairmarket, firstpairmarkprice, firstpairindexprice,
          firstpairvolume, firstpairfundingrate,
          secondpairexchange, secondpairmarket, secondpairmarkprice, secondpairindexprice,
          secondpairvolume, secondpairfundingrate,
          differencemark, differenceindex, differencemarkpercentage, differenceindexpercentage,
          differencefundingratepercent, isfundingrateopposite,
          firstexchangenetworks, secondexchangenetworks,
          timeoflife,
          timeelapsed::text as timeelapsed,
          updatedat, createdat
        FROM diffsfutures
        ${whereClause}
        ORDER BY differencefundingratepercent DESC
        LIMIT ${limitValue}
      `
    : Prisma.sql`
        SELECT
          id, pairkey, symbol, baseasset, quoteasset,
          firstpairexchange, firstpairmarket, firstpairmarkprice, firstpairindexprice,
          firstpairvolume, firstpairfundingrate,
          secondpairexchange, secondpairmarket, secondpairmarkprice, secondpairindexprice,
          secondpairvolume, secondpairfundingrate,
          differencemark, differenceindex, differencemarkpercentage, differenceindexpercentage,
          differencefundingratepercent, isfundingrateopposite,
          firstexchangenetworks, secondexchangenetworks,
          timeoflife,
          timeelapsed::text as timeelapsed,
          updatedat, createdat
        FROM diffsfutures
        ${whereClause}
        ORDER BY differencefundingratepercent DESC
      `

  const results = await prisma.$queryRaw<FuturesDiff[]>(query)
  return results
}

/**
 * Check if user has active subscription
 */
export async function checkSubscription(userId: string): Promise<{
  hasSubscription: boolean
  expiresInDays: number | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPaid: true,
      paidUntil: true,
    },
  })

  if (!user) {
    return { hasSubscription: false, expiresInDays: null }
  }

  const now = new Date()
  const hasSubscription = user.isPaid && user.paidUntil && new Date(user.paidUntil) > now

  const expiresInDays = user.paidUntil
    ? Math.ceil((new Date(user.paidUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return { hasSubscription: !!hasSubscription, expiresInDays }
}
