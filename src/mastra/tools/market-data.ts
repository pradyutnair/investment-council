import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import yahooFinance from 'yahoo-finance2';
import { config } from '../config';

/**
 * Supported data types for market data
 */
export const DataTypeEnum = z.enum([
  'financials',
  'insider',
  'price',
  'segments',
]);

/**
 * Input schema for market data tool
 */
const inputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  dataType: DataTypeEnum.describe('Type of data to retrieve'),
});

/**
 * Output schema for market data tool
 */
const outputSchema = z.object({
  ticker: z.string(),
  dataType: z.string(),
  data: z.any(),
  source: z.enum(['fmp', 'yahoo']),
  timestamp: z.string(),
});

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

/**
 * Fetch data from FMP API
 */
async function fetchFromFMP(ticker: string, dataType: string) {
  const endpoints: Record<string, string> = {
    financials: `/financials/income-statement/${ticker}`,
    insider: `/insider-trading/${ticker}`,
    price: `/quote/${ticker}`,
    segments: `/financials/balance-sheet-segment/${ticker}`,
  };

  const endpoint = endpoints[dataType];
  if (!endpoint) {
    throw new Error(`Unknown data type: ${dataType}`);
  }

  const response = await ky.get(`${FMP_BASE_URL}${endpoint}`, {
    searchParams: {
      apikey: config.fmpApiKey,
    },
    timeout: 10000, // 10 second timeout
  }).json<any>();

  return response;
}

/**
 * Fetch data from Yahoo Finance as fallback
 */
async function fetchFromYahoo(ticker: string, dataType: string) {
  switch (dataType) {
    case 'price':
      const quote = await yahooFinance.quote(ticker) as any;
      return {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        marketCap: quote.marketCap,
        volume: quote.regularMarketVolume,
        previousClose: quote.previousClose,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
      };

    case 'financials':
      // Yahoo Finance doesn't provide detailed financials in free tier
      // Return basic info
      const detail = await yahooFinance.quoteSummary(ticker, {
        modules: ['defaultKeyStatistics', 'financialData'],
      });
      return detail;

    case 'insider':
      // Yahoo Finance doesn't provide insider trading data
      throw new Error('Insider trading data not available on Yahoo Finance');

    case 'segments':
      // Yahoo Finance doesn't provide segment data
      throw new Error('Segment data not available on Yahoo Finance');

    default:
      throw new Error(`Unknown data type: ${dataType}`);
  }
}

/**
 * Market Data Tool
 *
 * Tries FMP API first, falls back to Yahoo Finance on failure.
 * Supports multiple data types including financials, insider trading,
 * price data, and business segment information.
 */
export const marketDataTool = createTool({
  id: 'market-data',
  description: `Fetch financial market data for a given ticker.

Supports multiple data types:
- financials: Income statements, balance sheets, cash flows
- insider: Insider trading activity
- price: Current stock price and basic metrics
- segments: Business segment breakdowns

Tries FMP API first, falls back to Yahoo Finance if FMP fails.`,
  inputSchema,
  outputSchema,
  execute: async ({ context }) => {
    const { ticker, dataType } = context;

    try {
      // Try FMP API first
      const data = await fetchFromFMP(ticker, dataType);

      return {
        ticker,
        dataType,
        data,
        source: 'fmp' as const,
        timestamp: new Date().toISOString(),
      };
    } catch (fmpError) {
      const errorMessage = fmpError instanceof Error ? fmpError.message : 'Unknown error';
      console.warn(`FMP API failed for ${ticker}: ${errorMessage}. Falling back to Yahoo Finance`);

      try {
        // Fallback to Yahoo Finance
        const data = await fetchFromYahoo(ticker, dataType);

        return {
          ticker,
          dataType,
          data,
          source: 'yahoo' as const,
          timestamp: new Date().toISOString(),
        };
      } catch (yahooError) {
        const yahooErrorMessage = yahooError instanceof Error ? yahooError.message : 'Unknown error';
        throw new Error(
          `Failed to fetch data from both FMP and Yahoo Finance. ` +
          `FMP Error: ${errorMessage}. ` +
          `Yahoo Error: ${yahooErrorMessage}`
        );
      }
    }
  },
});
