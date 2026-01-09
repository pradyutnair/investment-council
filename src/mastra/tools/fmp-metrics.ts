import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Key Metrics Tool
const keyMetricsInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type: annual or quarterly'),
  limit: z.number().default(5).describe('Number of periods to retrieve'),
});

const keyMetricsOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpKeyMetrics = createTool({
  id: 'fmp-key-metrics',
  description: `Fetch key financial metrics for a given ticker.

Provides essential valuation and financial metrics including:
- Market cap, enterprise value
- PE ratio, PB ratio, PS ratio
- EV/EBITDA, EV/Revenue
- Dividend yield, dividend per share
- ROE, ROA, ROI
- Profit margins (gross, operating, net)
- Debt-to-equity, current ratio
- Free cash flow per share
- Book value per share

Use this for quick valuation and financial health assessment.`,
  inputSchema: keyMetricsInputSchema,
  outputSchema: keyMetricsOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';
    const response = await ky.get(`${FMP_BASE_URL}/key-metrics/${ticker}${periodType}`, {
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

// Key Metrics TTM (Trailing Twelve Months)
const keyMetricsTTMInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const keyMetricsTTMOutputSchema = z.object({
  ticker: z.string(),
  data: z.any(),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpKeyMetricsTTM = createTool({
  id: 'fmp-key-metrics-ttm',
  description: `Fetch trailing twelve months (TTM) key metrics for a given ticker.

Provides the most recent 12-month financial metrics including:
- Market cap, enterprise value
- PE ratio (TTM), PB ratio
- EV/EBITDA (TTM), EV/Revenue (TTM)
- Dividend yield, dividend per share
- ROE, ROA, ROI (TTM)
- Profit margins (TTM)
- Free cash flow (TTM)

Use this for current valuation metrics without seasonality bias.`,
  inputSchema: keyMetricsTTMInputSchema,
  outputSchema: keyMetricsTTMOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/key-metrics-ttm/${ticker}`, {
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

// Financial Ratios Tool
const financialRatiosInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type: annual or quarterly'),
  limit: z.number().default(5).describe('Number of periods to retrieve'),
});

const financialRatiosOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpFinancialRatios = createTool({
  id: 'fmp-financial-ratios',
  description: `Fetch comprehensive financial ratios for a given ticker.

Provides detailed ratio analysis including:
- Liquidity ratios: current, quick, cash ratios
- Profitability ratios: ROE, ROA, ROIC, gross margin, operating margin
- Leverage ratios: debt-to-equity, debt-to-assets, interest coverage
- Efficiency ratios: asset turnover, inventory turnover
- Valuation ratios: PE, PB, PS, EV/EBITDA, PEG

Use this for comprehensive ratio analysis and comparison.`,
  inputSchema: financialRatiosInputSchema,
  outputSchema: financialRatiosOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';
    const response = await ky.get(
      `${FMP_BASE_URL}/ratios/${ticker}${periodType}`,
      {
        searchParams: {
          apikey: config.fmpApiKey as string,
          limit: limit.toString(),
        },
        timeout: 10000,
      }
    ).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Enterprise Values Tool
const enterpriseValuesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type: annual or quarterly'),
  limit: z.number().default(5).describe('Number of periods to retrieve'),
});

const enterpriseValuesOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpEnterpriseValues = createTool({
  id: 'fmp-enterprise-values',
  description: `Fetch enterprise value metrics for a given ticker.

Provides enterprise value components including:
- Market capitalization
- Enterprise value (EV)
- Total debt
- Cash and cash equivalents
- Minority interest
- Preferred equity
- Number of shares outstanding

Use this for calculating EV-based multiples and understanding capital structure.`,
  inputSchema: enterpriseValuesInputSchema,
  outputSchema: enterpriseValuesOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';
    const response = await ky.get(
      `${FMP_BASE_URL}/enterprise-values/${ticker}${periodType}`,
      {
        searchParams: {
          apikey: config.fmpApiKey as string,
          limit: limit.toString(),
        },
        timeout: 10000,
      }
    ).json<any>();

    return {
      ticker,
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});

// Growth Rates Tool
const growthRatesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const growthRatesOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpGrowthRates = createTool({
  id: 'fmp-growth-rates',
  description: `Fetch historical growth rates for a given ticker.

Provides year-over-year growth rates for:
- Revenue growth (3-year, 5-year, 10-year)
- Earnings growth (3-year, 5-year, 10-year)
- EBITDA growth
- Net income growth
- EPS growth
- Dividend growth

Use this for analyzing company growth trends and historical performance.`,
  inputSchema: growthRatesInputSchema,
  outputSchema: growthRatesOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/growth/${ticker}`, {
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
