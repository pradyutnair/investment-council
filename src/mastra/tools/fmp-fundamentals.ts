import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Income Statement Tool
const incomeStatementInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type: annual or quarterly'),
  limit: z.number().default(10).describe('Number of periods to retrieve (max: 120)'),
});

const incomeStatementOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpIncomeStatement = createTool({
  id: 'fmp-income-statement',
  description: `Fetch income statement data for a given ticker.

Provides comprehensive income statement metrics including:
- Revenue and cost of revenue
- Gross profit, operating income
- Net income, EPS (basic and diluted)
- EBITDA, depreciation & amortization
- Interest expense, tax expenses

Supports both annual and quarterly periods.`,
  inputSchema: incomeStatementInputSchema,
  outputSchema: incomeStatementOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';
    const response = await ky.get(
      `${FMP_BASE_URL}/income-statement/${ticker}${periodType}`,
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

// Balance Sheet Tool
const balanceSheetInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type: annual or quarterly'),
  limit: z.number().default(10).describe('Number of periods to retrieve (max: 120)'),
});

const balanceSheetOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpBalanceSheet = createTool({
  id: 'fmp-balance-sheet',
  description: `Fetch balance sheet data for a given ticker.

Provides comprehensive balance sheet metrics including:
- Assets: current and non-current assets, cash, inventory
- Liabilities: current and long-term debt, accounts payable
- Equity: shareholder equity, retained earnings
- Key ratios: debt-to-equity, current ratio

Supports both annual and quarterly periods.`,
  inputSchema: balanceSheetInputSchema,
  outputSchema: balanceSheetOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';
    const response = await ky.get(
      `${FMP_BASE_URL}/balance-sheet-statement/${ticker}${periodType}`,
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

// Cash Flow Statement Tool
const cashFlowInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type: annual or quarterly'),
  limit: z.number().default(10).describe('Number of periods to retrieve (max: 120)'),
});

const cashFlowOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpCashFlow = createTool({
  id: 'fmp-cash-flow',
  description: `Fetch cash flow statement data for a given ticker.

Provides comprehensive cash flow metrics including:
- Operating cash flow
- Investing cash flow (CapEx, acquisitions)
- Financing cash flow (debt, dividends, buybacks)
- Free cash flow
- Capital expenditures

Supports both annual and quarterly periods.`,
  inputSchema: cashFlowInputSchema,
  outputSchema: cashFlowOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';
    const response = await ky.get(
      `${FMP_BASE_URL}/cash-flow-statement/${ticker}${periodType}`,
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

// All Financial Statements Tool (Combined)
const allFinancialsInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  period: z.enum(['annual', 'quarterly']).default('annual').describe('Period type: annual or quarterly'),
  limit: z.number().default(5).describe('Number of periods to retrieve for each statement'),
});

const allFinancialsOutputSchema = z.object({
  ticker: z.string(),
  incomeStatement: z.array(z.any()),
  balanceSheet: z.array(z.any()),
  cashFlow: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpAllFinancials = createTool({
  id: 'fmp-all-financials',
  description: `Fetch all three financial statements for a given ticker in a single call.

Returns income statement, balance sheet, and cash flow data together.
Useful for comprehensive financial analysis when you need all statements.

Supports both annual and quarterly periods.`,
  inputSchema: allFinancialsInputSchema,
  outputSchema: allFinancialsOutputSchema,
  execute: async ({ context }) => {
    const { ticker, period, limit } = context;

    const periodType = period === 'quarterly' ? '' : '?periodType=annual';

    const [income, balance, cash] = await Promise.all([
      ky.get(`${FMP_BASE_URL}/income-statement/${ticker}${periodType}`, {
        searchParams: { apikey: config.fmpApiKey as string, limit: limit.toString() },
        timeout: 10000,
      }).json<any>(),
      ky.get(`${FMP_BASE_URL}/balance-sheet-statement/${ticker}${periodType}`, {
        searchParams: { apikey: config.fmpApiKey as string, limit: limit.toString() },
        timeout: 10000,
      }).json<any>(),
      ky.get(`${FMP_BASE_URL}/cash-flow-statement/${ticker}${periodType}`, {
        searchParams: { apikey: config.fmpApiKey as string, limit: limit.toString() },
        timeout: 10000,
      }).json<any>(),
    ]);

    return {
      ticker,
      incomeStatement: Array.isArray(income) ? income : [income],
      balanceSheet: Array.isArray(balance) ? balance : [balance],
      cashFlow: Array.isArray(cash) ? cash : [cash],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});
