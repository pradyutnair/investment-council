/**
 * FMP Tools Index
 *
 * Central export point for all FMP-based financial data tools.
 * These tools replace the legacy LangChain-based tools in src/tools/.
 */

// Import all tools for re-export
import {
  fmpIncomeStatement,
  fmpBalanceSheet,
  fmpCashFlow,
  fmpAllFinancials,
} from './fmp-fundamentals';

import {
  fmpPriceSnapshot,
  fmpHistoricalPrices,
  fmpIntradayPrices,
  fmpPriceTarget,
} from './fmp-prices';

import {
  fmpKeyMetrics,
  fmpKeyMetricsTTM,
  fmpFinancialRatios,
  fmpEnterpriseValues,
  fmpGrowthRates,
} from './fmp-metrics';

import {
  fmpSecFilings,
  fmp10KFiling,
  fmp10QFiling,
  fmp8KFiling,
  fmpCIKSearch,
} from './fmp-filings';

import {
  fmpNews,
  fmpGeneralNews,
  fmpNewsSentiment,
  fmpPressReleases,
} from './fmp-news';

import {
  fmpAnalystEstimates,
  fmpEarningsSurprises,
  fmpEarningsCalendar,
  fmpUpcomingEarnings,
  fmpRevenueEstimates,
} from './fmp-estimates';

import {
  fmpRevenueSegments,
  fmpBusinessSegments,
  fmpGeographicSegments,
  fmpESGScore,
} from './fmp-segments';

import {
  fmpInsiderTrading,
  fmpInsiderSummary,
  fmpInsiderRoster,
  fmpInstitutionalHolders,
  fmpMutualFundHolders,
} from './fmp-insider';

import {
  fmpCryptoPrice,
  fmpCryptoHistoricalPrices,
  fmpCryptoList,
  fmpCryptoMarket,
} from './fmp-crypto';

import {
  fmpScreener,
  fmpValueScreener,
  fmpGrowthScreener,
  fmpDistressedScreener,
  fmpDividendScreener,
  fmpGainers,
  fmpLosers,
  fmpActive,
  fmpSectorPerformance,
} from './fmp-screener';

// Re-export all tools
export {
  fmpIncomeStatement,
  fmpBalanceSheet,
  fmpCashFlow,
  fmpAllFinancials,
  fmpPriceSnapshot,
  fmpHistoricalPrices,
  fmpIntradayPrices,
  fmpPriceTarget,
  fmpKeyMetrics,
  fmpKeyMetricsTTM,
  fmpFinancialRatios,
  fmpEnterpriseValues,
  fmpGrowthRates,
  fmpSecFilings,
  fmp10KFiling,
  fmp10QFiling,
  fmp8KFiling,
  fmpCIKSearch,
  fmpNews,
  fmpGeneralNews,
  fmpNewsSentiment,
  fmpPressReleases,
  fmpAnalystEstimates,
  fmpEarningsSurprises,
  fmpEarningsCalendar,
  fmpUpcomingEarnings,
  fmpRevenueEstimates,
  fmpRevenueSegments,
  fmpBusinessSegments,
  fmpGeographicSegments,
  fmpESGScore,
  fmpInsiderTrading,
  fmpInsiderSummary,
  fmpInsiderRoster,
  fmpInstitutionalHolders,
  fmpMutualFundHolders,
  fmpCryptoPrice,
  fmpCryptoHistoricalPrices,
  fmpCryptoList,
  fmpCryptoMarket,
  fmpScreener,
  fmpValueScreener,
  fmpGrowthScreener,
  fmpDistressedScreener,
  fmpDividendScreener,
  fmpGainers,
  fmpLosers,
  fmpActive,
  fmpSectorPerformance,
};

/**
 * Export all tools as an object for easy access
 */
export const fmpTools = {
  // Fundamentals
  fmpIncomeStatement,
  fmpBalanceSheet,
  fmpCashFlow,
  fmpAllFinancials,

  // Prices
  fmpPriceSnapshot,
  fmpHistoricalPrices,
  fmpIntradayPrices,
  fmpPriceTarget,

  // Metrics
  fmpKeyMetrics,
  fmpKeyMetricsTTM,
  fmpFinancialRatios,
  fmpEnterpriseValues,
  fmpGrowthRates,

  // SEC Filings
  fmpSecFilings,
  fmp10KFiling,
  fmp10QFiling,
  fmp8KFiling,
  fmpCIKSearch,

  // News
  fmpNews,
  fmpGeneralNews,
  fmpNewsSentiment,
  fmpPressReleases,

  // Estimates
  fmpAnalystEstimates,
  fmpEarningsSurprises,
  fmpEarningsCalendar,
  fmpUpcomingEarnings,
  fmpRevenueEstimates,

  // Segments
  fmpRevenueSegments,
  fmpBusinessSegments,
  fmpGeographicSegments,
  fmpESGScore,

  // Insider Trading
  fmpInsiderTrading,
  fmpInsiderSummary,
  fmpInsiderRoster,
  fmpInstitutionalHolders,
  fmpMutualFundHolders,

  // Crypto
  fmpCryptoPrice,
  fmpCryptoHistoricalPrices,
  fmpCryptoList,
  fmpCryptoMarket,

  // Screener
  fmpScreener,
  fmpValueScreener,
  fmpGrowthScreener,
  fmpDistressedScreener,
  fmpDividendScreener,
  fmpGainers,
  fmpLosers,
  fmpActive,
  fmpSectorPerformance,
} as const;

/**
 * Export tool categories for organized access
 */
export const fmpToolCategories = {
  fundamentals: {
    fmpIncomeStatement,
    fmpBalanceSheet,
    fmpCashFlow,
    fmpAllFinancials,
  },
  prices: {
    fmpPriceSnapshot,
    fmpHistoricalPrices,
    fmpIntradayPrices,
    fmpPriceTarget,
  },
  metrics: {
    fmpKeyMetrics,
    fmpKeyMetricsTTM,
    fmpFinancialRatios,
    fmpEnterpriseValues,
    fmpGrowthRates,
  },
  filings: {
    fmpSecFilings,
    fmp10KFiling,
    fmp10QFiling,
    fmp8KFiling,
    fmpCIKSearch,
  },
  news: {
    fmpNews,
    fmpGeneralNews,
    fmpNewsSentiment,
    fmpPressReleases,
  },
  estimates: {
    fmpAnalystEstimates,
    fmpEarningsSurprises,
    fmpEarningsCalendar,
    fmpUpcomingEarnings,
    fmpRevenueEstimates,
  },
  segments: {
    fmpRevenueSegments,
    fmpBusinessSegments,
    fmpGeographicSegments,
    fmpESGScore,
  },
  insider: {
    fmpInsiderTrading,
    fmpInsiderSummary,
    fmpInsiderRoster,
    fmpInstitutionalHolders,
    fmpMutualFundHolders,
  },
  crypto: {
    fmpCryptoPrice,
    fmpCryptoHistoricalPrices,
    fmpCryptoList,
    fmpCryptoMarket,
  },
  screener: {
    fmpScreener,
    fmpValueScreener,
    fmpGrowthScreener,
    fmpDistressedScreener,
    fmpDividendScreener,
    fmpGainers,
    fmpLosers,
    fmpActive,
    fmpSectorPerformance,
  },
} as const;
