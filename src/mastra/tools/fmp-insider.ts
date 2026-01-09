import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Insider Trading Tool
const insiderTradingInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(100).describe('Number of transactions to retrieve'),
});

const insiderTradingOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpInsiderTrading = createTool({
  id: 'fmp-insider-trading',
  description: `Fetch insider trading activity for a given ticker.

Provides Form 4 insider trading data including:
- Insider name and relationship
- Transaction type (buy/sell)
- Number of shares traded
- Transaction price
- Transaction date
- Shares owned after transaction
- SEC filing URL

Use this to:
- Track insider sentiment
- Identify potential bullish/bearish signals
- Monitor management confidence
- Detect unusual insider activity
- Understand ownership changes

Insider buying can indicate confidence. Selling may be for diversification
or signal concerns. Context matters - look for patterns.`,
  inputSchema: insiderTradingInputSchema,
  outputSchema: insiderTradingOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/insider-trading/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
        limit: limit.toString(),
      },
      timeout: 10000,
    }).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Insider Trading Summary Tool
const insiderSummaryInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const insiderSummaryOutputSchema = z.object({
  ticker: z.string(),
  data: z.object({
    totalBuyTransactions: z.number(),
    totalSellTransactions: z.number(),
    netShares: z.number(),
    totalMSPR: z.number().optional(),
  }),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpInsiderSummary = createTool({
  id: 'fmp-insider-summary',
  description: `Fetch insider trading summary statistics for a given ticker.

Provides aggregated insider activity including:
- Total buy transactions
- Total sell transactions
- Net shares traded (buys minus sells)
- Transaction value totals
- Recent activity trend

Use this to quickly assess insider sentiment without analyzing individual transactions.
A positive net share count indicates net buying, negative indicates net selling.`,
  inputSchema: insiderSummaryInputSchema,
  outputSchema: insiderSummaryOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/insider-trading/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
        limit: '1000',
      },
      timeout: 10000,
    }).json<any>();

    const transactions = Array.isArray(response) ? response : [response];

    let buyTransactions = 0;
    let sellTransactions = 0;
    let netShares = 0;

    transactions.forEach((t: any) => {
      const shares = t.acquisitionDisposition || 0;
      if (t.transactionCode === 'P' || t.transactionCode === 'M') {
        buyTransactions++;
        netShares += shares;
      } else if (t.transactionCode === 'S') {
        sellTransactions++;
        netShares -= shares;
      }
    });

    return {
      ticker,
      data: {
        totalBuyTransactions: buyTransactions,
        totalSellTransactions: sellTransactions,
        netShares,
        totalTransactions: transactions.length,
      },
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Insider Roster Tool
const insiderRosterInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const insiderRosterOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpInsiderRoster = createTool({
  id: 'fmp-insider-roster',
  description: `Fetch current insider ownership roster for a given ticker.

Provides list of all insiders including:
- Insider name and title
- Relationship to company
- Total shares owned
- Percent ownership
- Last transaction date
- Recent activity

Use this to:
- Understand insider ownership structure
- Identify key shareholders
- Assess management skin in the game
- Monitor ownership concentration

High insider ownership often aligns management with shareholders.
Track changes over time for insights.`,
  inputSchema: insiderRosterInputSchema,
  outputSchema: insiderRosterOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/insider-roster/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Institutional Holders Tool
const institutionalHoldersInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(20).describe('Number of holders to retrieve'),
});

const institutionalHoldersOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpInstitutionalHolders = createTool({
  id: 'fmp-institutional-holders',
  description: `Fetch institutional shareholders for a given ticker.

Provides major institutional holders including:
- Institution name
- Number of shares held
- Value of holdings
- Percent of outstanding shares
- Change in position (when available)

Use this to:
- Understand ownership structure
- Identify major shareholders
- Track institutional sentiment
- Assess support from smart money
- Monitor potential activist activity

Institutional ownership indicates confidence from sophisticated investors.
Significant position changes can signal changing sentiment.`,
  inputSchema: institutionalHoldersInputSchema,
  outputSchema: institutionalHoldersOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/institutional-holder/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
        limit: limit.toString(),
      },
      timeout: 10000,
    }).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Mutual Fund Holders Tool
const mutualFundHoldersInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(20).describe('Number of holders to retrieve'),
});

const mutualFundHoldersOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpMutualFundHolders = createTool({
  id: 'fmp-mutual-fund-holders',
  description: `Fetch mutual fund shareholders for a given ticker.

Provides major mutual fund holders including:
- Fund name
- Number of shares held
- Value of holdings
- Percent of outstanding shares
- Date reported

Use this to:
- Understand retail ownership
- Track mutual fund sentiment
- Identify potential support from funds
- Monitor fund inflows/outflows

Mutual fund ownership can provide stability and demand support.`,
  inputSchema: mutualFundHoldersInputSchema,
  outputSchema: mutualFundHoldersOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/mutual-fund-holder/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
        limit: limit.toString(),
      },
      timeout: 10000,
    }).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});
