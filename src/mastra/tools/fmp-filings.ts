import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { config } from '../config';

/**
 * FMP API base URL
 */
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// SEC Filings List Tool
const secFilingsInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  filingType: z.string().optional().describe('Filter by filing type (e.g., 10-K, 10-Q, 8-K)'),
  limit: z.number().default(50).describe('Number of filings to retrieve'),
});

const secFilingsOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpSecFilings = createTool({
  id: 'fmp-sec-filings',
  description: `Fetch SEC filings list for a given ticker.

Provides metadata for all SEC filings including:
- Filing type (10-K, 10-Q, 8-K, 13D, 13G, etc.)
- Filing date
- Accepted date
- URL to the filing
- Filing description

Use this to:
- Find recent corporate actions
- Track quarterly/annual reports
- Identify special situation events (spinoffs, mergers, etc.)
- Monitor insider and activist activity

Filter by specific filing type to narrow results.`,
  inputSchema: secFilingsInputSchema,
  outputSchema: secFilingsOutputSchema,
  execute: async ({ context }) => {
    const { ticker, filingType, limit } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
      limit: limit.toString(),
    };

    if (filingType) {
      searchParams.type = filingType;
    }

    const response = await ky.get(`${FMP_BASE_URL}/sec_filings/${ticker}`, {
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

// 10-K Filing Tool
const filing10KInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  year: z.number().optional().describe('Specific year to retrieve (optional)'),
});

const filing10KOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmp10KFiling = createTool({
  id: 'fmp-10k-filing',
  description: `Fetch 10-K annual report filings for a given ticker.

Provides full 10-K filings including:
- Item 1: Business
- Item 1A: Risk Factors
- Item 2: Properties
- Item 3: Legal Proceedings
- Item 4: Mine Safety
- Item 5: Market for Registrant's Common Equity
- Item 6: Selected Financial Data
- Item 7: Management's Discussion and Analysis
- Item 7A: Quantitative and Qualitative Disclosures About Market Risk
- Item 8: Financial Statements and Supplementary Data
- Item 9: Changes in and Disagreements With Accountants
- Item 9A: Controls and Procedures
- Item 9B: Other Information
- Item 10: Directors, Executive Officers and Corporate Governance
- Item 11: Executive Compensation
- Item 12: Security Ownership of Certain Beneficial Owners
- Item 13: Certain Relationships and Related Transactions
- Item 14: Principal Accountant Fees and Services

Use this for comprehensive annual analysis and full financial statement review.`,
  inputSchema: filing10KInputSchema,
  outputSchema: filing10KOutputSchema,
  execute: async ({ context }) => {
    const { ticker, year } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
    };

    if (year) {
      searchParams.year = year.toString();
    }

    const response = await ky.get(`${FMP_BASE_URL}/sec_filings/${ticker}/10-K`, {
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

// 10-Q Filing Tool
const filing10QInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  year: z.number().optional().describe('Specific year to retrieve (optional)'),
  quarter: z.number().optional().describe('Specific quarter (1-4) to retrieve (optional)'),
});

const filing10QOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmp10QFiling = createTool({
  id: 'fmp-10q-filing',
  description: `Fetch 10-Q quarterly report filings for a given ticker.

Provides full 10-Q filings including:
- Part I: Financial Information
  - Item 1: Financial Statements
  - Item 2: Management's Discussion and Analysis
  - Item 3: Quantitative and Qualitative Disclosures About Market Risk
  - Item 4: Controls and Procedures
- Part II: Other Information
  - Item 1: Legal Proceedings
  - Item 1A: Risk Factors
  - Item 2: Unregistered Sales of Equity Securities
  - Item 3: Defaults Upon Senior Securities
  - Item 4: Mine Safety
  - Item 5: Other Information
  - Item 6: Exhibits

Use this for quarterly updates and ongoing performance tracking.`,
  inputSchema: filing10QInputSchema,
  outputSchema: filing10QOutputSchema,
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

    const response = await ky.get(`${FMP_BASE_URL}/sec_filings/${ticker}/10-Q`, {
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

// 8-K Filing Tool
const filing8KInputSchema = z.object({
  ticker: z.string().min(1).describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  limit: z.number().default(50).describe('Number of 8-K filings to retrieve'),
});

const filing8KOutputSchema = z.object({
  ticker: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmp8KFiling = createTool({
  id: 'fmp-8k-filing',
  description: `Fetch 8-K current report filings for a given ticker.

Provides 8-K filings which report material events including:
- Item 1.01: Entry into a Material Definitive Agreement
- Item 1.02: Termination of a Material Definitive Agreement
- Item 2.01: Completion of Acquisition or Disposition of Assets
- Item 2.02: Results of Operations and Financial Condition
- Item 2.03: Material Agreements (directors, officers)
- Item 2.05: Accounting Fees and Services
- Item 2.06: Material Impairments
- Item 3.01: Notice of Delisting or Failure to Satisfy Listing Rule
- Item 3.02: Unregistered Sales of Equity Securities
- Item 4.01: Changes in Registrant's Certifying Accountant
- Item 4.02: Non-Reliance on Previously Issued Financial Statements
- Item 5.01: Changes in Control of Registrant
- Item 5.02: Departure of Directors or Principal Officers
- Item 5.03: Amendments to Articles of Incorporation or Bylaws
- Item 5.07: Submission of Matters to a Vote of Security Holders
- Item 5.08: Shareholder Director Nominations
- Item 6.01: ABS Informational and Computational Material
- Item 6.02: Changes to Servicing Mortgages
- Item 6.03: Changes to Credit Enhancement
- Item 6.04: Failure to Make a Required Distribution
- Item 6.05: SEC Acting as Custodian
- Item 7.01: Regulation FD Disclosure
- Item 8.01: Other Events
- Item 9.01: Financial Statements and Exhibits

Use this to monitor real-time corporate events and material changes.`,
  inputSchema: filing8KInputSchema,
  outputSchema: filing8KOutputSchema,
  execute: async ({ context }) => {
    const { ticker, limit } = context;

    const response = await ky.get(`${FMP_BASE_URL}/sec_filings/${ticker}/8-K`, {
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

// SEC Filing Search by CIK
const cikSearchInputSchema = z.object({
  cik: z.string().min(1).describe('Central Index Key (CIK) of the company'),
  filingType: z.string().optional().describe('Filter by filing type (e.g., 10-K, 10-Q, 8-K)'),
});

const cikSearchOutputSchema = z.object({
  cik: z.string(),
  data: z.array(z.any()),
  source: z.literal('fmp'),
  timestamp: z.string(),
});

export const fmpCIKSearch = createTool({
  id: 'fmp-cik-search',
  description: `Search SEC filings by Central Index Key (CIK).

Use this when you have a CIK instead of a ticker symbol.
Returns the same filing metadata as the ticker-based search.

CIK is a unique identifier assigned by the SEC to each company, individual, or entity that files disclosures.`,
  inputSchema: cikSearchInputSchema,
  outputSchema: cikSearchOutputSchema,
  execute: async ({ context }) => {
    const { cik, filingType } = context;

    const searchParams: Record<string, string> = {
      apikey: config.fmpApiKey as string,
    };

    if (filingType) {
      searchParams.type = filingType;
    }

    const response = await ky.get(`${FMP_BASE_URL}/sec_filings_cik/${cik}`, {
      searchParams,
      timeout: 10000,
    }).json<any>();

    return {
      cik,
      data: Array.isArray(response) ? response : [response],
      source: 'fmp' as const,
      timestamp: new Date().toISOString(),
    };
  },
});
