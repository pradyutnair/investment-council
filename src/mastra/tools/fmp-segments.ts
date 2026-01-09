import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Revenue Segments Tool
const revenueSegmentsInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  structure: z.enum(['flat', 'hierarchical']).default('flat').describe('Structure of segment data'),
});

const revenueSegmentsOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpRevenueSegments = createTool({
  id: 'fmp-revenue-segments',
  description: `Fetch revenue breakdown by business segments for a given ticker.

Provides segment-level revenue data including:
- Geographic segments (by country or region)
- Product segments (by product line or category)
- Revenue for each segment
- Growth rates by segment
- Segment margins (when available)

Use this to:
- Understand revenue diversification
- Identify high-growth segments
- Analyze geographic exposure
- Assess product mix changes
- Perform segment-level analysis

Essential for companies with multiple business units or global operations.`,
  inputSchema: revenueSegmentsInputSchema,
  outputSchema: revenueSegmentsOutputSchema,
  execute: async ({ context }) => {
    const { ticker, structure } = context;

    const response = await ky.get(`${FMP_BASE_URL}/revenue-segmentation/${ticker}`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
        structure,
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

// Business Segments Tool (Expanded)
const businessSegmentsInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type'),
  limit: z.number().default(5).describe('Number of periods to retrieve'),
});

const businessSegmentsOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpBusinessSegments = createTool({
  id: 'fmp-business-segments',
  description: `Fetch detailed business segment data for a given ticker.

Provides comprehensive segment information including:
- Segment names and descriptions
- Revenue by segment
- Operating income by segment
- Capital expenditure by segment
- Depreciation and amortization by segment
- Assets by segment (when available)
- Segment margins and profitability

Use this for:
- Deep segment-level analysis
- Evaluating segment profitability
- Identifying value-creating segments
- Capital allocation assessment
- Segment contribution to overall results

Critical for conglomerates and multi-business companies.`,
  inputSchema: businessSegmentsInputSchema,
  outputSchema: businessSegmentsOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';
    const response = await ky.get(
      `${FMP_BASE_URL}/income-statement-segments/${ticker}${periodType}`,
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

// Geographic Segments Tool
const geographicSegmentsInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const geographicSegmentsOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpGeographicSegments = createTool({
  id: 'fmp-geographic-segments',
  description: `Fetch geographic breakdown of revenue for a given ticker.

Provides revenue by geographic region including:
- Domestic revenue
- International revenue by region
- Country-specific revenue (when available)
- Growth rates by geography
- Geographic risk exposure

Use this to:
- Analyze geographic diversification
- Identify growth regions
- Assess international exposure
- Understand currency impact
- Evaluate geopolitical risk

Important for companies with significant international operations.`,
  inputSchema: geographicSegmentsInputSchema,
  outputSchema: geographicSegmentsOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/geographic-segmentation/${ticker}`, {
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

// ESG Score Tool (Related to business segments and sustainability)
const esgScoreInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
});

const esgScoreOutputSchema = z.object({
  ticker: z.string(),
  data: z.any(),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpESGScore = createTool({
  id: 'fmp-esg-score',
  description: `Fetch ESG (Environmental, Social, Governance) scores for a given ticker.

Provides ESG ratings including:
- Overall ESG score
- Environmental score
- Social score
- Governance score
- ESG percentile
- ESG rating category

Use this to:
- Evaluate sustainability practices
- Assess governance quality
- Consider ESG factors in investing
- Compare ESG performance
- Meet ESG investment criteria

Increasingly important for long-term investors and risk assessment.`,
  inputSchema: esgScoreInputSchema,
  outputSchema: esgScoreOutputSchema,
  execute: async ({ context }) => {
    const { ticker } = context;

    const response = await ky.get(`${FMP_BASE_URL}/esg-environmental-social-governance-data/${ticker}`, {
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
