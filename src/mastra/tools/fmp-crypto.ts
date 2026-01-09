import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Crypto Price Snapshot Tool
const cryptoPriceInputSchema = z.object({
  symbol: z.string().min(1).describe('Cryptocurrency symbol (e.g., BTC, ETH, ADA)'),
});

const cryptoPriceOutputSchema = z.object({
  symbol: z.string(),
  data: z.any(),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpCryptoPrice = createTool({
  id: 'fmp-crypto-price',
  description: `Fetch current price data for a cryptocurrency.

Provides real-time crypto price information including:
- Current price in USD
- 24-hour price change
- 24-hour high and low
- 24-hour volume
- Market cap
- Circulating supply
- Total supply
- All-time high
- Price change percentages

Use this for up-to-date cryptocurrency pricing information.

Supported symbols: BTC, ETH, BNB, XRP, ADA, DOGE, SOL, DOT, and many more.`,
  inputSchema: cryptoPriceInputSchema,
  outputSchema: cryptoPriceOutputSchema,
  execute: async ({ context }) => {
    const { symbol } = context;

    const response = await ky.get(`${FMP_BASE_URL}/quote/${symbol}`, {
      searchParams: {
        apikey: config.fmpApiKey,
      },
      timeout: 10000,
    }).json<any>();

    return {
      symbol,
      data: Array.isArray(response) ? response[0] : response,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Crypto Historical Prices Tool
const cryptoHistoricalPricesInputSchema = z.object({
  symbol: z.string().min(1).describe('Cryptocurrency symbol (e.g., BTC, ETH)'),
  from: z.string().optional().describe('Start date in YYYY-MM-DD format (optional)'),
  to: z.string().optional().describe('End date in YYYY-MM-DD format (optional)'),
  timeseries: z.number().default(30).describe('Number of days of historical data to retrieve'),
});

const cryptoHistoricalPricesOutputSchema = z.object({
  symbol: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpCryptoHistoricalPrices = createTool({
  id: 'fmp-crypto-historical-prices',
  description: `Fetch historical price data for a cryptocurrency.

Provides historical daily price information including:
- Date, open, high, low, close prices
- Volume
- Market cap
- Price changes

Use this for:
- Technical analysis and charting
- Price trend analysis
- Historical performance evaluation
- Backtesting trading strategies

Default: 30 days of data. Can specify date ranges with 'from' and 'to' parameters.`,
  inputSchema: cryptoHistoricalPricesInputSchema,
  outputSchema: cryptoHistoricalPricesOutputSchema,
  execute: async ({ context }) => {
    const { symbol, from, to, timeseries } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
    };

    if (from) searchParams.from = from;
    if (to) searchParams.to = to;

    const response = await ky.get(`${FMP_BASE_URL}/historical-price-full/crypto/${symbol}`, {
      searchParams,
      timeout: 10000,
    }).json<any>();

    // FMP returns historical data with a 'historical' array
    let historical = response?.historical || [];
    if (!Array.isArray(historical)) {
      historical = [historical];
    }

    // Limit to timeseries if date range not specified
    if (!from && !to && timeseries) {
      historical = historical.slice(0, timeseries);
    }

    return {
      symbol,
      data: historical,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Available Cryptocurrencies Tool
const cryptoListOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpCryptoList = createTool({
  id: 'fmp-crypto-list',
  description: `Fetch list of all available cryptocurrencies on FMP.

Provides comprehensive list including:
- Symbol/ticker
- Name
- Current price (when available)
- Market cap

Use this to:
- Discover available crypto assets
- Validate crypto symbols
- Browse supported cryptocurrencies
- Get market overview

Returns all supported cryptocurrencies that can be queried with other crypto tools.`,
  inputSchema: z.object({}),
  outputSchema: cryptoListOutputSchema,
  execute: async () => {
    const response = await ky.get(`${FMP_BASE_URL}/symbol/available-cryptocurrencies`, {
      searchParams: {
        apikey: config.fmpApiKey,
      },
      timeout: 10000,
    }).json<any>();

    return {
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Crypto Market Overview
const cryptoMarketOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpCryptoMarket = createTool({
  id: 'fmp-crypto-market',
  description: `Fetch market overview of major cryptocurrencies.

Provides snapshot of top cryptocurrencies including:
- Top cryptos by market cap
- Price and 24h change
- Volume
- Market dominance

Use this to:
- Get quick market overview
- Identify market leaders
- Track overall crypto market trends
- Compare major cryptocurrencies

Focuses on the most significant cryptocurrencies by market cap and volume.`,
  inputSchema: z.object({
    limit: z.number().default(20).describe('Number of cryptocurrencies to retrieve'),
  }),
  outputSchema: cryptoMarketOutputSchema,
  execute: async ({ context }) => {
    const { limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/quotes/crypto`, {
      searchParams: {
        apikey: config.fmpApiKey,
      },
      timeout: 10000,
    }).json<any>();

    const data = Array.isArray(response) ? response : [response];

    return {
      data: data.slice(0, limit),
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});
