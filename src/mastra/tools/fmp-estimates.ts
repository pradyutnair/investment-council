import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Analyst Estimates Tool
const analystEstimatesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  year: z.number().optional().describe('Specific year to retrieve estimates for (optional)'),
  quarter: z.number().optional().describe('Specific quarter (1-4) to retrieve estimates for (optional)'),
});

const analystEstimatesOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpAnalystEstimates = createTool({
  id: 'fmp-analyst-estimates',
  description: `Fetch analyst estimates for a given ticker.

Provides analyst forecasts including:
- Earnings per share (EPS) estimates
- Revenue estimates
- EBITDA estimates
- Net income estimates
- Estimate trend over time
- Number of analysts providing estimates
- High and low estimates

Use this to:
- Compare actual results vs expectations
- Understand analyst sentiment
- Track estimate revisions
- Gauge growth expectations

Data is available quarterly and annually. Without specifying year/quarter, returns all available estimates.`,
  inputSchema: analystEstimatesInputSchema,
  outputSchema: analystEstimatesOutputSchema,
  execute: async ({ context }) => {
    const { ticker, year, quarter } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
    };

    if (year) {
      searchParams.year = year.toString();
    }
    if (quarter) {
      searchParams.quarter = quarter.toString();
    }

    const response = await ky.get(`${FMP_BASE_URL}/analyst-estimates/${ticker}`, {
      searchParams,
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

// Earnings Surprises Tool
const earningsSurprisesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(10).describe('Number of quarters to retrieve'),
});

const earningsSurprisesOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpEarningsSurprises = createTool({
  id: 'fmp-earnings-surprises',
  description: `Fetch earnings surprises and actual vs estimated data for a given ticker.

Provides quarterly earnings results including:
- Actual EPS
- Estimated EPS
- Surprise amount (difference)
- Surprise percentage
- Revenue actual vs estimate
- Earnings date
- Fiscal year and quarter

Use this to:
- Evaluate earnings quality
- Identify beat/miss patterns
- Understand market reactions
- Assess management guidance
- Track execution consistency

Positive surprises may indicate conservative guidance or operational excellence.
Negative surprises may signal challenges or unrealistic expectations.`,
  inputSchema: earningsSurprisesInputSchema,
  outputSchema: earningsSurprisesOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/earnings-surprises/${ticker}`, {
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

// Earnings Calendar Tool
const earningsCalendarInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const earningsCalendarOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpEarningsCalendar = createTool({
  id: 'fmp-earnings-calendar',
  description: `Fetch upcoming and historical earnings dates for a given ticker.

Provides earnings announcement dates including:
- Earnings date
- Fiscal period ending
- Fiscal year and quarter
- Estimated EPS (when available)
- EPS confirmation (when reported)

Use this to:
- Plan investment timing around earnings
- Anticipate volatility periods
- Track earnings season schedule
- Prepare for potential catalysts

Earnings announcements are major catalysts for stock movement.`,
  inputSchema: earningsCalendarInputSchema,
  outputSchema: earningsCalendarOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/earnings-calendar/${ticker}`, {
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

// Upcoming Earnings (General)
const upcomingEarningsInputSchema = z.object({
  limit: z.number().default(20).describe('Number of companies to retrieve'),
});

const upcomingEarningsOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpUpcomingEarnings = createTool({
  id: 'fmp-upcoming-earnings',
  description: `Fetch upcoming earnings announcements for the market.

Returns a list of companies reporting earnings soon including:
- Ticker symbol
- Company name
- Earnings date and time
- Estimated EPS
- Fiscal period ending
- Market cap

Use this to:
- Monitor overall earnings season
- Identify potential volatility in holdings
- Plan trading around earnings
- Spot potential trading opportunities

Sorted by upcoming earnings date (nearest first).`,
  inputSchema: upcomingEarningsInputSchema,
  outputSchema: upcomingEarningsOutputSchema,
  execute: async ({ context }) => {
    const { limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/earning_surprises`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
      },
      timeout: 10000,
    }).json<any>();

    return {
      data: Array.isArray(response) ? response.slice(0, limit) : [],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Revenue Estimates Tool
const revenueEstimatesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  year: z.number().optional().describe('Specific year to retrieve estimates for (optional)'),
  quarter: z.number().optional().describe('Specific quarter (1-4) to retrieve estimates for (optional)'),
});

const revenueEstimatesOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpRevenueEstimates = createTool({
  id: 'fmp-revenue-estimates',
  description: `Fetch revenue estimates for a given ticker.

Provides analyst revenue forecasts including:
- Estimated revenue
- Revenue estimate trend
- Number of analysts
- High and low estimates

Use this to:
- Understand growth expectations
- Compare actual vs estimated revenue
- Track revenue forecast revisions
- Assess market expectations for growth

Revenue growth is a key driver for stock valuation, especially for growth companies.`,
  inputSchema: revenueEstimatesInputSchema,
  outputSchema: revenueEstimatesOutputSchema,
  execute: async ({ context }) => {
    const { ticker, year, quarter } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
    };

    if (year) {
      searchParams.year = year.toString();
    }
    if (quarter) {
      searchParams.quarter = quarter.toString();
    }

    const response = await ky.get(`${FMP_BASE_URL}/revenue-estimates/${ticker}`, {
      searchParams,
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
