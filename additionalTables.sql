CREATE TABLE pairs (
    id SERIAL PRIMARY KEY,  -- Штучний унікальний ключ
    pairKey VARCHAR(50) UNIQUE NOT NULL,  -- Композитний ключ (e.g., "BTCUSDT_Binance_spot")
    symbol VARCHAR(20) NOT NULL,      -- Trading symbol (e.g., "BTCUSDT")
    exchange VARCHAR(20) NOT NULL,    -- Market exchange (e.g., "Binance")
    market VARCHAR(20) NOT NULL,      -- Market type (e.g., "spot" or "futures")
    price DECIMAL(18,8) NOT NULL,    -- Максимальна точність
    baseAsset VARCHAR(20) NOT NULL,   -- Base asset (e.g., "BTC")
    quoteAsset VARCHAR(20) NOT NULL,  -- Quote asset (e.g., "USDT")
    displayName VARCHAR(20) NOT NULL, -- Formatted display (e.g., "BTC/USDT")
    priceChangePercent24h DECIMAL(10,2) NOT NULL,
    baseVolume24h DECIMAL(20,2) NOT NULL,
    quoteVolume24h DECIMAL(20,2) NOT NULL,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX symbol_idx ON pairs (symbol);
CREATE INDEX pairKey_idx ON pairs (pairKey);
CREATE INDEX exchange_market_idx ON pairs (exchange, market);

CREATE TABLE IF NOT EXISTS diffs (
    id SERIAL PRIMARY KEY,
    pairKey VARCHAR(60) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    baseAsset VARCHAR(20) NOT NULL,   -- Base asset (e.g., "BTC")
    quoteAsset VARCHAR(20) NOT NULL,  -- Quote asset (e.g., "USDT")
    firstPairExchange VARCHAR(20) NOT NULL,
    firstPairMarket VARCHAR(20) NOT NULL,
    firstPairPrice DECIMAL(20,8) NOT NULL,
    firstPairVolume DECIMAL(30,2) NOT NULL,
    secondPairExchange VARCHAR(20) NOT NULL,
    secondPairMarket VARCHAR(20) NOT NULL,
    secondPairPrice DECIMAL(20,8) NOT NULL,
    secondPairVolume DECIMAL(30,2) NOT NULL,
    difference DECIMAL(20,8) NOT NULL,
    differencePercentage DECIMAL(12,2) NOT NULL,
    firstExchangeNetworks JSONB DEFAULT '{}'::JSONB,
    secondExchangeNetworks JSONB DEFAULT '{}'::JSONB,
    timeOfLife TIMESTAMP NULL,
    timeElapsed INTERVAL NOT NULL DEFAULT '0 seconds',
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS diffs_symbol_idx ON diffs (symbol);
CREATE INDEX IF NOT EXISTS diffs_pairKey_idx ON diffs (pairKey);
CREATE INDEX IF NOT EXISTS diffs_differencePercentage_idx ON diffs (differencePercentage);

CREATE TABLE IF NOT EXISTS nets (
    id SERIAL PRIMARY KEY,
    coinKey VARCHAR(100) UNIQUE NOT NULL,  -- Унікальний ключ (e.g., "BTC_Binance_BTC")
    coin VARCHAR(50) NOT NULL,              -- Назва монети (e.g., "BTC")
    exchange VARCHAR(20) NOT NULL,          -- Біржа (e.g., "Binance")
    network VARCHAR(50) NOT NULL,           -- Назва мережі (e.g., "BTC", "BSC", "ERC20")
    networkName VARCHAR(50) NOT NULL,           
    depositEnable BOOLEAN NOT NULL,         -- Чи доступний депозит
    withdrawEnable BOOLEAN NOT NULL,         -- Чи доступний вивід
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS nets_coin_idx ON nets (coin);
CREATE INDEX IF NOT EXISTS nets_exchange_idx ON nets (exchange);
CREATE INDEX IF NOT EXISTS nets_network_idx ON nets (network);



CREATE TABLE IF NOT EXISTS pairsfutures (
    id SERIAL PRIMARY KEY,  -- Штучний унікальний ключ
    pairKey VARCHAR(50) UNIQUE NOT NULL,  -- Композитний ключ (e.g., "BTCUSDT_Binance_futures")
    symbol VARCHAR(20) NOT NULL,      -- Trading symbol (e.g., "BTCUSDT")
    exchange VARCHAR(20) NOT NULL,    -- Market exchange (e.g., "Binance")
    market VARCHAR(20) NOT NULL,      -- Market type (e.g., "spot" or "futures")
    markPrice DECIMAL(18,8) NOT NULL,     
    indexPrice DECIMAL(18,8) NOT NULL,    
    baseAsset VARCHAR(20) NOT NULL,   -- Base asset (e.g., "BTC")
    quoteAsset VARCHAR(20) NOT NULL,  -- Quote asset (e.g., "USDT")
    displayName VARCHAR(20) NOT NULL, -- Formatted display (e.g., "BTC/USDT")
    fundingRatePercent DECIMAL(14,10) NOT NULL, -- 
    nextFundingTimestamp BIGINT NOT NULL, -- 1744070400000
    priceChangePercent24h DECIMAL(10,2) NOT NULL,
    baseVolume24h DECIMAL(20,2) NOT NULL,
    quoteVolume24h DECIMAL(20,2) NOT NULL,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX symbolFutures_idx ON pairsfutures (symbol);
CREATE INDEX pairKeyFutures_idx ON pairsfutures (pairKey);
CREATE INDEX exchange_market_futures_idx ON pairsfutures (exchange, market);




CREATE TABLE IF NOT EXISTS diffsfutures (
    id SERIAL PRIMARY KEY,
    pairKey VARCHAR(60) UNIQUE NOT NULL,
    symbol VARCHAR(40) NOT NULL,
    baseAsset VARCHAR(20) NOT NULL,   -- Base asset (e.g., "BTC")
    quoteAsset VARCHAR(20) NOT NULL,  -- Quote asset (e.g., "USDT")
    firstPairExchange VARCHAR(20) NOT NULL,
    firstPairMarket VARCHAR(20) NOT NULL,
    firstPairMarkPrice DECIMAL(20,8) NOT NULL,
    firstPairIndexPrice DECIMAL(20,8) NOT NULL,
    firstPairVolume DECIMAL(30,2) NOT NULL,
    firstPairFundingRate DECIMAL(10,6) NOT NULL, --

    secondPairExchange VARCHAR(20) NOT NULL,
    secondPairMarket VARCHAR(20) NOT NULL,
    secondPairMarkPrice DECIMAL(20,8) NOT NULL,
    secondPairIndexPrice DECIMAL(20,8) NOT NULL,
    secondPairVolume DECIMAL(30,2) NOT NULL,
    secondPairFundingRate DECIMAL(10,6) NOT NULL, 

    differenceMark DECIMAL(20,8) NOT NULL,
    differenceIndex DECIMAL(20,8) NOT NULL,
    differenceMarkPercentage DECIMAL(12,2) NOT NULL,
    differenceIndexPercentage DECIMAL(12,2) NOT NULL,
    differenceFundingRatePercent DECIMAL(10,6) NOT NULL, --
    isFundingRateOpposite BOOLEAN NOT NULL DEFAULT FALSE,
    
    firstExchangeNetworks JSONB DEFAULT '{}'::JSONB,
    secondExchangeNetworks JSONB DEFAULT '{}'::JSONB,
    timeOfLife TIMESTAMP NULL,
    timeElapsed INTERVAL NOT NULL DEFAULT '0 seconds',
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS diffs_symbol_futures_idx ON diffsfutures (symbol);
CREATE INDEX IF NOT EXISTS diffs_pairKey_futures_idx ON diffsfutures (pairKey);
-- CREATE INDEX IF NOT EXISTS diffs_differencePercentage_futures_idx ON diffsfutures (differencePercentage);