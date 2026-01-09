import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Company News Tool
const newsInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(50).describe('Number of news articles to retrieve (max 1000)'),
});

const newsOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpNews = createTool({
  id: 'fmp-news',
  description: `Fetch latest news articles for a given ticker.

Provides recent news including:
- Article title and description
- Publication date and time
- Source (website name)
- URL to full article
- Related tickers
- Author name (when available)
- Sentiment analysis (positive, negative, neutral)
- Image URL (when available)

Use this to:
- Monitor breaking news
- Understand market sentiment
- Identify catalysts for price movement
- Research company developments
- Track industry trends

News is sorted by most recent first.`,
  inputSchema: newsInputSchema,
  outputSchema: newsOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/news/${ticker}`, {
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

// General Market News Tool
const generalNewsInputSchema = z.object({
  page: z.number().default(0).describe('Page number for pagination (0-based)'),
  size: z.number().default(20).describe('Number of articles per page'),
});

const generalNewsOutputSchema = z.object({
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
  page: z.number(),
});

export const fmpGeneralNews = createTool({
  id: 'fmp-general-news',
  description: `Fetch general stock market news.

Provides recent market-wide news including:
- Major market developments
- Economic indicators
- Federal Reserve and policy news
- Sector-wide trends
- IPO updates
- M&A announcements
- Market analysis and commentary

Use this to stay informed about overall market conditions and major events that may affect your investment decisions.

News is curated from major financial news sources and covers US equities, ETFs, and major indices.`,
  inputSchema: generalNewsInputSchema,
  outputSchema: generalNewsOutputSchema,
  execute: async ({ context }) => {
    const { page, size } = context;

    const response = await ky.get(`${FMP_BASE_URL}/general_news`, {
      searchParams: {
        apikey: config.fmpApiKey as string,
        page: page.toString(),
        size: size.toString(),
      },
      timeout: 10000,
    }).json<any>();

    return {
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
      page,
    };
  },
});

// News Sentiment Tool
const sentimentInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(50).describe('Number of articles to analyze (max 1000)'),
});

const sentimentOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpNewsSentiment = createTool({
  id: 'fmp-news-sentiment',
  description: `Fetch news articles with sentiment analysis for a given ticker.

Provides recent news with enhanced sentiment data including:
- Article title and content
- Publication date and time
- Source and URL
- Sentiment score (positive, negative, neutral)
- Sentiment magnitude (strength of sentiment)
- Keywords and topics extracted

Use this to:
- Gauge market sentiment toward a stock
- Identify positive or negative trends
- Understand the strength of market reactions
- Filter news by sentiment for analysis

Sentiment is calculated using natural language processing on news content.`,
  inputSchema: sentimentInputSchema,
  outputSchema: sentimentOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/news-sentiments/${ticker}`, {
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

// Press Releases Tool
const pressReleasesInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(50).describe('Number of press releases to retrieve'),
});

const pressReleasesOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpPressReleases = createTool({
  id: 'fmp-press-releases',
  description: `Fetch official press releases for a given ticker.

Provides official company announcements including:
- Earnings releases and guidance
- Product launches and updates
- Management changes
- Strategic initiatives and partnerships
- M&A announcements
- Dividend declarations
- Corporate actions
- Conference presentations

Use this to get official, first-hand information directly from the company.
Press releases are primary sources for material corporate events.`,
  inputSchema: pressReleasesInputSchema,
  outputSchema: pressReleasesOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/press-releases/${ticker}`, {
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
