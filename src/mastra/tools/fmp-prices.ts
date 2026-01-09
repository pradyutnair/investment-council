import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Price Snapshot Tool
const priceSnapshotInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const priceSnapshotOutputSchema = z.object({
  ticker: z.string(),
  data: z.any(),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpPriceSnapshot = createTool({
  id: 'fmp-price-snapshot',
  description: `Fetch current price data for a given ticker.

Provides real-time price information including:
- Current price, change, change percentage
- Day high, day low, previous close
- 52-week high and low
- Volume and average volume
- Market cap, shares outstanding
- PE ratio, EPS
- Beta, earnings announcement date

Use this for up-to-date pricing information.`,
  inputSchema: priceSnapshotInputSchema,
  outputSchema: priceSnapshotOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/quote/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response[0] : response,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Historical Prices Tool
const historicalPricesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  from: z.string().optional().describe('Start date in YYYY-MM-DD format (optional)'),
  to: z.string().optional().describe('End date in YYYY-MM-DD format (optional)'),
  timeseries: z.number().default(30).describe('Number of days of historical data to retrieve'),
});

const historicalPricesOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpHistoricalPrices = createTool({
  id: 'fmp-historical-prices',
  description: `Fetch historical price data for a given ticker.

Provides historical daily price information including:
- Date, open, high, low, close prices
- Volume
- Adjusted close (for splits/dividends)
- VWAP (volume-weighted average price)

Use this for:
- Technical analysis and charting
- Price trend analysis
- Historical performance evaluation
- Backtesting strategies

Default: 30 days of data. Can specify date ranges with 'from' and 'to' parameters.`,
  inputSchema: historicalPricesInputSchema,
  outputSchema: historicalPricesOutputSchema,
  execute: async ({ context }) => {
    const { ticker, from, to, timeseries } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
    };

    if (from) searchParams.from = from;
    if (to) searchParams.to = to;

    const response = await ky.get(`${FMP_BASE_URL}/historical-price-full/${ticker}`, {
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
      ticker,
      data: historical,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Intraday Prices Tool
const intradayPricesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  interval: z.enum(['1min', '5min', '15min', '30min', '1hour']).default('5min').describe('Time interval between data points'),
  from: z.string().optional().describe('Start date in YYYY-MM-DD format (optional)'),
  to: z.string().optional().describe('End date in YYYY-MM-DD format (optional)'),
});

const intradayPricesOutputSchema = z.object({
  ticker: z.string(),
  interval: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpIntradayPrices = createTool({
  id: 'fmp-intraday-prices',
  description: `Fetch intraday (minute-by-minute) price data for a given ticker.

Provides intraday price information for:
- Day trading analysis
- Short-term price movement tracking
- Intraday technical analysis
- Real-time pattern recognition

Available intervals: 1min, 5min, 15min, 30min, 1hour
Note: Intraday data is only available for the current day and recent days.`,
  inputSchema: intradayPricesInputSchema,
  outputSchema: intradayPricesOutputSchema,
  execute: async ({ context }) => {
    const { ticker, interval, from, to } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
      interval: interval === '1hour' ? '1hour' : interval.replace('min', 'min'),
    };

    if (from) searchParams.from = from;
    if (to) searchParams.to = to;

    const response = await ky.get(`${FMP_BASE_URL}/historical-chart/${interval}/${ticker}`, {
      searchParams,
      timeout: 10000,
    }).json<any>();

    return {
      ticker,
      interval,
      data: Array.isArray(response) ? response : [],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Price Target Tool
const priceTargetInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const priceTargetOutputSchema = z.object({
  ticker: z.string(),
  data: z.any(),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpPriceTarget = createTool({
  id: 'fmp-price-target',
  description: `Fetch analyst price targets and ratings for a given ticker.

Provides analyst recommendations including:
- Current price vs target price
- Analyst ratings (strong buy, buy, hold, sell, strong sell)
- Number of analysts covering the stock
- Price target high, low, and average
- Upside/downside potential

Use this to gauge market sentiment and analyst expectations.`,
  inputSchema: priceTargetInputSchema,
  outputSchema: priceTargetOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/analyst-price-target/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response[0] : response,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});
