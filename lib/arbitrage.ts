import { prisma } from "@/lib/prisma"

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
 * Parse interval string like "1 minute", "2 hours" to PostgreSQL interval
 */
function parseInterval(value: string): string {
  // Already in valid format like "1 minute", "2 hours", etc.
  return value
}

/**
 * Get spot diffs with filtering
 */
export async function getSpotDiffs(params: SpotDiffsParams): Promise<SpotDiff[]> {
  const { topRows, exchanges, minDiffPerc, maxDiffPerc, symbols, minLifeTime, maxLifeTime } = params

  // Build dynamic query with parameterized values for security
  // Column names are lowercase in PostgreSQL (no quotes needed)
  let whereConditions: string[] = ["1=1"]

  // Filter by exchanges
  if (exchanges && exchanges.length > 0 && exchanges[0] !== "") {
    const exchangeList = exchanges.map((e) => `'${e.replace(/'/g, "''")}'`).join(",")
    whereConditions.push(`firstpairexchange IN (${exchangeList})`)
    whereConditions.push(`secondpairexchange IN (${exchangeList})`)
  }

  // Filter by difference percentage
  if (minDiffPerc && minDiffPerc !== "0" && minDiffPerc !== "undefined") {
    const minVal = parseFloat(minDiffPerc)
    if (!isNaN(minVal)) {
      whereConditions.push(`differencepercentage >= ${minVal}`)
    }
  }
  if (maxDiffPerc && maxDiffPerc !== "0" && maxDiffPerc !== "undefined") {
    const maxVal = parseFloat(maxDiffPerc)
    if (!isNaN(maxVal)) {
      whereConditions.push(`differencepercentage <= ${maxVal}`)
    }
  }

  // Filter by symbols
  if (symbols && symbols.length > 0 && symbols[0] !== "") {
    const symbolList = symbols.map((s) => `'${s.replace(/'/g, "''")}'`).join(",")
    whereConditions.push(`symbol IN (${symbolList})`)
  }

  // Filter by life time
  if (minLifeTime && minLifeTime !== "undefined") {
    whereConditions.push(`timeelapsed >= INTERVAL '${parseInterval(minLifeTime)}'`)
  }
  if (maxLifeTime && maxLifeTime !== "undefined") {
    whereConditions.push(`timeelapsed <= INTERVAL '${parseInterval(maxLifeTime)}'`)
  }

  // Exclude zero volume and extreme differences
  whereConditions.push(`firstpairvolume <> 0`)
  whereConditions.push(`secondpairvolume <> 0`)
  whereConditions.push(`differencepercentage < 100000`)

  const whereClause = whereConditions.join(" AND ")

  // Determine limit
  let limitClause = "LIMIT 500"
  if (topRows && topRows.toLowerCase() !== "all" && topRows !== "undefined") {
    const limit = parseInt(topRows)
    if (!isNaN(limit)) {
      limitClause = `LIMIT ${limit}`
    }
  } else if (topRows?.toLowerCase() === "all") {
    limitClause = ""
  }

  const query = `
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
    WHERE ${whereClause}
    ORDER BY differencepercentage DESC
    ${limitClause}
  `

  const results = await prisma.$queryRawUnsafe<SpotDiff[]>(query)
  return results
}

/**
 * Get futures diffs with filtering
 */
export async function getFuturesDiffs(params: FuturesDiffsParams): Promise<FuturesDiff[]> {
  const { topRows, exchanges, symbols, coins, opposite } = params

  let whereConditions: string[] = ["1=1"]

  // Filter by exchanges
  if (exchanges && exchanges.length > 0 && exchanges[0] !== "") {
    const exchangeList = exchanges.map((e) => `'${e.replace(/'/g, "''")}'`).join(",")
    whereConditions.push(`firstpairexchange IN (${exchangeList})`)
    whereConditions.push(`secondpairexchange IN (${exchangeList})`)
  }

  // Filter by symbols
  if (symbols && symbols.length > 0 && symbols[0] !== "") {
    const symbolList = symbols.map((s) => `'${s.replace(/'/g, "''")}'`).join(",")
    whereConditions.push(`symbol IN (${symbolList})`)
  }

  // Filter by opposite funding rate
  if (opposite) {
    whereConditions.push(`isfundingrateopposite = true`)
  }

  // Filter by coins (base or quote asset)
  if (coins && coins.length > 0 && coins[0] !== "") {
    const coinConditions = coins.map(
      (c) => `(baseasset = '${c.replace(/'/g, "''")}' OR quoteasset = '${c.replace(/'/g, "''")}')`
    )
    whereConditions.push(`(${coinConditions.join(" OR ")})`)
  }

  // Exclude zero volume
  whereConditions.push(`firstpairvolume <> 0`)
  whereConditions.push(`secondpairvolume <> 0`)

  const whereClause = whereConditions.join(" AND ")

  // Determine limit
  let limitClause = "LIMIT 500"
  if (topRows && topRows.toLowerCase() !== "all" && topRows !== "undefined") {
    const limit = parseInt(topRows)
    if (!isNaN(limit)) {
      limitClause = `LIMIT ${limit}`
    }
  } else if (topRows?.toLowerCase() === "all") {
    limitClause = ""
  }

  const query = `
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
    WHERE ${whereClause}
    ORDER BY differencefundingratepercent DESC
    ${limitClause}
  `

  const results = await prisma.$queryRawUnsafe<FuturesDiff[]>(query)
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
