import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// General Screener Tool
const screenerInputSchema = z.object({
  marketCapMoreThan: z.number().optional().describe('Minimum market cap in millions'),
  marketCapLowerThan: z.number().optional().describe('Maximum market cap in millions'),
  priceMoreThan: z.number().optional().describe('Minimum stock price'),
  priceLowerThan: z.number().optional().describe('Maximum stock price'),
  betaMoreThan: z.number().optional().describe('Minimum beta'),
  betaLowerThan: z.number().optional().describe('Maximum beta'),
  volumeMoreThan: z.number().optional().describe('Minimum trading volume'),
  volumeLowerThan: z.number().optional().describe('Maximum trading volume'),
  dividendMoreThan: z.number().optional().describe('Minimum dividend yield'),
  dividendLowerThan: z.number().optional().describe('Maximum dividend yield'),
  isEtf: z.boolean().optional().describe('Include or exclude ETFs'),
  isActivelyTrading: z.boolean().optional().describe('Only actively trading stocks'),
  sector: z.string().optional().describe('Filter by sector'),
  industry: z.string().optional().describe('Filter by industry'),
  country: z.string().optional().describe('Filter by country'),
  exchange: z.string().optional().describe('Filter by exchange (NYSE, NASDAQ, etc.)'),
  limit: z.number().default(100).describe('Maximum number of results'),
});

const screenerOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpScreener = createTool({
  id: 'fmp-screener',
  description: `Screen stocks based on multiple criteria using FMP's stock screener.

This is a general-purpose screener that can filter by:
- Market capitalization
- Price range
- Beta (volatility)
- Trading volume
- Dividend yield
- Sector and industry
- Exchange
- Country
- ETF status

Use this to create custom screens for any investment strategy.

Returns array of stocks matching all specified criteria.`,
  inputSchema: screenerInputSchema,
  outputSchema: screenerOutputSchema,
  execute: async ({ context }) => {
    const params = context;
    const limit = params.limit || 100;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
      limit: limit.toString(),
    };

    // Add all optional parameters
    if (params.marketCapMoreThan !== undefined) searchParams.marketCapMoreThan = params.marketCapMoreThan.toString();
    if (params.marketCapLowerThan !== undefined) searchParams.marketCapLowerThan = params.marketCapLowerThan.toString();
    if (params.priceMoreThan !== undefined) searchParams.priceMoreThan = params.priceMoreThan.toString();
    if (params.priceLowerThan !== undefined) searchParams.priceLowerThan = params.priceLowerThan.toString();
    if (params.betaMoreThan !== undefined) searchParams.betaMoreThan = params.betaMoreThan.toString();
    if (params.betaLowerThan !== undefined) searchParams.betaLowerThan = params.betaLowerThan.toString();
    if (params.volumeMoreThan !== undefined) searchParams.volumeMoreThan = params.volumeMoreThan.toString();
    if (params.volumeLowerThan !== undefined) searchParams.volumeLowerThan = params.volumeLowerThan.toString();
    if (params.dividendMoreThan !== undefined) searchParams.dividendMoreThan = params.dividendMoreThan.toString();
    if (params.dividendLowerThan !== undefined) searchParams.dividendLowerThan = params.dividendLowerThan.toString();
    if (params.isEtf !== undefined) searchParams.isEtf = params.isEtf.toString();
    if (params.isActivelyTrading !== undefined) searchParams.isActivelyTrading = params.isActivelyTrading.toString();
    if (params.sector) searchParams.sector = params.sector;
    if (params.industry) searchParams.industry = params.industry;
    if (params.country) searchParams.country = params.country;
    if (params.exchange) searchParams.exchange = params.exchange;

    const response = await ky.get(`${FMP_BASE_URL}/stock-screener`, {
      searchParams,
      timeout: 15000,
    }).json<any>();

    const data = Array.isArray(response) ? response : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// Value Stocks Screener
const valueScreenerInputSchema = z.object({
  marketCapMoreThan: z.number().default(100).describe('Minimum market cap in millions'),
  priceLowerThan: z.number().default(1000).describe('Maximum stock price'),
  peRatioLowerThan: z.number().default(20).describe('Maximum P/E ratio'),
  pbRatioLowerThan: z.number().default(3).describe('Maximum P/B ratio'),
  dividendMoreThan: z.number().default(0).describe('Minimum dividend yield'),
  limit: z.number().default(50).describe('Maximum number of results'),
});

const valueScreenerOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpValueScreener = createTool({
  id: 'fmp-value-screener',
  description: `Screen for value stocks based on classic value investing criteria.

Filters for stocks that appear undervalued based on:
- Low P/E ratio (price relative to earnings)
- Low P/B ratio (price relative to book value)
- Market capitalization
- Dividend yield

Use this to find:
- Benjamin Graham-style value stocks
- Low P/E stocks
- Stocks trading below book value
- Dividend-paying value stocks

Default criteria: P/E < 20, P/B < 3, market cap > $100M`,
  inputSchema: valueScreenerInputSchema,
  outputSchema: valueScreenerOutputSchema,
  execute: async ({ context }) => {
    const { marketCapMoreThan, priceLowerThan, peRatioLowerThan, pbRatioLowerThan, dividendMoreThan, limit } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
      limit: limit.toString(),
      marketCapMoreThan: marketCapMoreThan.toString(),
      priceLowerThan: priceLowerThan.toString(),
      peRatioLowerThan: peRatioLowerThan.toString(),
      pbRatioLowerThan: pbRatioLowerThan.toString(),
      dividendMoreThan: dividendMoreThan.toString(),
      isActivelyTrading: 'true',
    };

    const response = await ky.get(`${FMP_BASE_URL}/stock-screener`, {
      searchParams,
      timeout: 15000,
    }).json<any>();

    const data = Array.isArray(response) ? response : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// Growth Stocks Screener
const growthScreenerInputSchema = z.object({
  marketCapMoreThan: z.number().default(500).describe('Minimum market cap in millions'),
  peRatioMoreThan: z.number().default(15).describe('Minimum P/E ratio (growth stocks often have higher P/E)'),
  limit: z.number().default(50).describe('Maximum number of results'),
});

const growthScreenerOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpGrowthScreener = createTool({
  id: 'fmp-growth-screener',
  description: `Screen for growth stocks based on growth characteristics.

Filters for stocks with growth potential:
- Higher P/E ratios (investors willing to pay for growth)
- Minimum market cap (focus on established companies)

Use this to find:
- High-growth companies
- Stocks with growth potential
- Companies in expanding industries

Note: Growth stocks typically have higher valuations due to expected future growth.`,
  inputSchema: growthScreenerInputSchema,
  outputSchema: growthScreenerOutputSchema,
  execute: async ({ context }) => {
    const { marketCapMoreThan, peRatioMoreThan, limit } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
      limit: limit.toString(),
      marketCapMoreThan: marketCapMoreThan.toString(),
      peRatioMoreThan: peRatioMoreThan.toString(),
      isActivelyTrading: 'true',
    };

    const response = await ky.get(`${FMP_BASE_URL}/stock-screener`, {
      searchParams,
      timeout: 15000,
    }).json<any>();

    const data = Array.isArray(response) ? response : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// Distressed Stocks Screener
const distressedScreenerInputSchema = z.object({
  priceLowerThan: z.number().default(5).describe('Maximum stock price'),
  marketCapLowerThan: z.number().default(500).describe('Maximum market cap in millions'),
  volumeMoreThan: z.number().default(100000).describe('Minimum trading volume'),
  limit: z.number().default(50).describe('Maximum number of results'),
});

const distressedScreenerOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpDistressedScreener = createTool({
  id: 'fmp-distressed-screener',
  description: `Screen for potentially distressed stocks.

Filters for stocks showing distress signals:
- Low stock price (below $5 by default)
- Small market cap
- Minimum volume to ensure liquidity

Use this to find:
- Potential turnaround candidates
- Stocks in financial distress
- Bankruptcy or restructuring opportunities
- Deep value opportunities

WARNING: Distressed stocks carry high risk. Always verify:
- Debt levels and solvency
- Bankruptcy filings
- Liquidity position
- Business viability

These stocks are volatile and may lose significant value.`,
  inputSchema: distressedScreenerInputSchema,
  outputSchema: distressedScreenerOutputSchema,
  execute: async ({ context }) => {
    const { priceLowerThan, marketCapLowerThan, volumeMoreThan, limit } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
      limit: limit.toString(),
      priceLowerThan: priceLowerThan.toString(),
      marketCapLowerThan: marketCapLowerThan.toString(),
      volumeMoreThan: volumeMoreThan.toString(),
      isActivelyTrading: 'true',
    };

    const response = await ky.get(`${FMP_BASE_URL}/stock-screener`, {
      searchParams,
      timeout: 15000,
    }).json<any>();

    const data = Array.isArray(response) ? response : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// High Dividend Screener
const dividendScreenerInputSchema = z.object({
  dividendMoreThan: z.number().default(3).describe('Minimum dividend yield percentage'),
  marketCapMoreThan: z.number().default(500).describe('Minimum market cap in millions'),
  limit: z.number().default(50).describe('Maximum number of results'),
});

const dividendScreenerOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpDividendScreener = createTool({
  id: 'fmp-dividend-screener',
  description: `Screen for high dividend yield stocks.

Filters for stocks paying attractive dividends:
- Minimum dividend yield
- Market cap minimum for stability

Use this to find:
- High dividend paying stocks
- Income-generating investments
- Dividend growth candidates
- Cash flow positive companies

Default: dividend yield > 3%, market cap > $500M

Note: High yields may indicate distress if yield is unusually high.
Always verify dividend sustainability and payout ratio.`,
  inputSchema: dividendScreenerInputSchema,
  outputSchema: dividendScreenerOutputSchema,
  execute: async ({ context }) => {
    const { dividendMoreThan, marketCapMoreThan, limit } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
      limit: limit.toString(),
      dividendMoreThan: dividendMoreThan.toString(),
      marketCapMoreThan: marketCapMoreThan.toString(),
      isActivelyTrading: 'true',
    };

    const response = await ky.get(`${FMP_BASE_URL}/stock-screener`, {
      searchParams,
      timeout: 15000,
    }).json<any>();

    const data = Array.isArray(response) ? response : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// Market Movers - Gainers
const gainersOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpGainers = createTool({
  id: 'fmp-gainers',
  description: `Fetch the top gainers (stocks with largest price increases) today.

Returns stocks showing the strongest positive momentum including:
- Ticker and company name
- Current price
- Price change and change percentage
- Volume
- Market cap

Use this to:
- Identify strong momentum
- Find stocks with positive news catalysts
- Track market sentiment
- Short-term trading ideas

Gainers may indicate positive news, strong earnings, or sector momentum.
Always research the underlying reason for the move.`,
  inputSchema: z.object({
    limit: z.number().default(20).describe('Maximum number of results'),
  }),
  outputSchema: gainersOutputSchema,
  execute: async ({ context }) => {
    const { limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/stock_market/gainers`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    const data = Array.isArray(response) ? response.slice(0, limit) : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// Market Movers - Losers
const losersOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpLosers = createTool({
  id: 'fmp-losers',
  description: `Fetch the top losers (stocks with largest price decreases) today.

Returns stocks showing the strongest negative momentum including:
- Ticker and company name
- Current price
- Price change and change percentage
- Volume
- Market cap

Use this to:
- Identify potential bargain opportunities
- Find stocks that may have oversold
- Spot negative news or earnings misses
- Contrarian investment opportunities

Losers may indicate bad news, earnings misses, or sector weakness.
Large drops can create opportunity if the sell-off is overdone.`,
  inputSchema: z.object({
    limit: z.number().default(20).describe('Maximum number of results'),
  }),
  outputSchema: losersOutputSchema,
  execute: async ({ context }) => {
    const { limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/stock_market/losers`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    const data = Array.isArray(response) ? response.slice(0, limit) : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// Active Stocks (High Volume)
const activeOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  count: z.number(),
});

export const fmpActive = createTool({
  id: 'fmp-active',
  description: `Fetch the most actively traded stocks by volume.

Returns stocks with the highest trading volume including:
- Ticker and company name
- Current price
- Price change and change percentage
- Volume
- Market cap

Use this to:
- Find liquid stocks for trading
- Identify unusual activity
- Spot stocks in play
- Gauge market interest

High volume can indicate:
- News-driven activity
- Institutional buying/selling
- Options expiration effects
- Sector rotation`,
  inputSchema: z.object({
    limit: z.number().default(20).describe('Maximum number of results'),
  }),
  outputSchema: activeOutputSchema,
  execute: async ({ context }) => {
    const { limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/stock_market/active`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    const data = Array.isArray(response) ? response.slice(0, limit) : [];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      count: data.length,
    };
  },
});

// Sector Performance
const sectorPerformanceOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpSectorPerformance = createTool({
  id: 'fmp-sector-performance',
  description: `Fetch sector performance data for the market.

Provides performance by sector including:
- Sector name
- Change percentage
- Market cap weighted performance

Use this to:
- Identify leading and lagging sectors
- Understand market rotation
- Spot sector trends
- Inform sector allocation decisions

Sector performance can help identify:
- Money flow between sectors
- Relative strength/weakness
- Economic cycle position
- Tactical allocation opportunities`,
  inputSchema: z.object({}),
  outputSchema: sectorPerformanceOutputSchema,
  execute: async () => {
    const response = await ky.get(`${FMP_BASE_URL}/sector-performance`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    const data = Array.isArray(response) ? response : [response];

    return {
      data,
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});
