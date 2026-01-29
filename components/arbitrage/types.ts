export interface SpotDiffData {
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
  timeoflife: string | null
  timeelapsed: string
  updatedat: string
  createdat: string
}

export interface FuturesDiffData {
  id: number
  pairkey: string
  symbol: string
  baseasset: string
  quoteasset: string
  firstpairexchange: string
  firstpairmarket: string
  firstpairmarkprice: number
  firstpairindexprice: number
  firstpairvolume: number
  firstpairfundingrate: number
  secondpairexchange: string
  secondpairmarket: string
  secondpairmarkprice: number
  secondpairindexprice: number
  secondpairvolume: number
  secondpairfundingrate: number
  differencemark: number
  differenceindex: number
  differencemarkpercentage: number
  differenceindexpercentage: number
  differencefundingratepercent: number
  isfundingrateopposite: boolean
  firstexchangenetworks: object | null
  secondexchangenetworks: object | null
  timeoflife: string | null
  timeelapsed: string
  updatedat: string
  createdat: string
}

export interface PairsFilterData {
  exchanges: string[]
  symbols: string[]
  coins?: string[]
}

export interface SpotFilters {
  topRows: string
  exchanges: string[]
  minDiffPerc: string
  maxDiffPerc: string
  symbol: string[]
  minLifeTime: string
  maxLifeTime: string
}

export interface FuturesFilters {
  topRows: string
  exchanges: string[]
  symbol: string[]
  coins: string[]
  opposite: boolean
}

export const REFRESH_INTERVALS = [
  { label: "Off", value: 0 },
  { label: "5 seconds", value: 5000 },
  { label: "10 seconds", value: 10000 },
  { label: "20 seconds", value: 20000 },
  { label: "30 seconds", value: 30000 },
  { label: "1 minute", value: 60000 },
]

export const TOP_ROWS_OPTIONS = [
  { label: "All", value: "All" },
  { label: "100", value: "100" },
  { label: "200", value: "200" },
  { label: "500", value: "500" },
  { label: "1000", value: "1000" },
  { label: "2000", value: "2000" },
  { label: "5000", value: "5000" },
]

export const DIFF_PERCENT_OPTIONS = [
  { label: "0.5%", value: "0.5" },
  { label: "1%", value: "1" },
  { label: "2%", value: "2" },
  { label: "5%", value: "5" },
  { label: "10%", value: "10" },
  { label: "20%", value: "20" },
  { label: "50%", value: "50" },
  { label: "100%", value: "100" },
]

export const LIFE_TIME_OPTIONS = [
  { label: "1 minute", value: "1 minute" },
  { label: "2 minutes", value: "2 minutes" },
  { label: "5 minutes", value: "5 minutes" },
  { label: "10 minutes", value: "10 minutes" },
  { label: "15 minutes", value: "15 minutes" },
  { label: "30 minutes", value: "30 minutes" },
  { label: "1 hour", value: "1 hour" },
  { label: "2 hours", value: "2 hours" },
  { label: "5 hours", value: "5 hours" },
  { label: "10 hours", value: "10 hours" },
]
