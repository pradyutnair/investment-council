/**
 * Mock Research Data for Test Mode
 *
 * This file contains example data for all research APIs to enable UI development
 * without making real API calls. Set TEST_MODE=true in your .env.local to enable.
 */

import type { ResearchStrategy } from '@/src/types/research';

// Generate a valid UUID v4 for mock session
function generateMockUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Use a fixed UUID for consistency during test mode, or generate a new one each time
// For testing purposes, we'll use a fixed UUID so refreshes work
export const MOCK_SESSION_ID = '00000000-0000-4000-8000-000000000001';

// Or use a random UUID if you prefer fresh sessions:
// export const MOCK_SESSION_ID = generateMockUUID();

// Mock discovered opportunities
export const MOCK_DISCOVERED_OPPORTUNITIES = [
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    thesis: 'Strong ecosystem with Services growth driving margins higher. Trading at reasonable P/E relative to growth.',
    type: 'Value',
    keyMetrics: {
      marketCap: 3000000000000,
      peRatio: 28,
      pbRatio: 45,
      dividendYield: 0.5,
      debtToEquity: 1.5,
      roe: 147,
      revenueGrowth: 8,
    },
    riskLevel: 'low' as const,
    score: 85,
  },
  {
    ticker: 'META',
    companyName: 'Meta Platforms Inc.',
    thesis: 'Re-rating due to AI efficiency and Reels monetization. Buybacks and strong free cash flow support valuation.',
    type: 'Growth at Reasonable Price',
    keyMetrics: {
      marketCap: 1200000000000,
      peRatio: 24,
      pbRatio: 6,
      dividendYield: 0,
      debtToEquity: 0.1,
      roe: 25,
      revenueGrowth: 20,
    },
    riskLevel: 'medium' as const,
    score: 78,
  },
  {
    ticker: 'BAC',
    companyName: 'Bank of America Corporation',
    thesis: 'Beneficiary of higher rates with significant net interest income growth. Trading below book value.',
    type: 'Value',
    keyMetrics: {
      marketCap: 230000000000,
      peRatio: 9,
      pbRatio: 0.9,
      dividendYield: 2.8,
      debtToEquity: 1.2,
      roe: 11,
      revenueGrowth: 5,
    },
    riskLevel: 'medium' as const,
    score: 72,
  },
];

// Mock research report for a single opportunity
export function getMockResearchReport(ticker: string): string {
  return `# Investment Research: ${ticker}

## Executive Summary

After comprehensive analysis, **${ticker}** presents a compelling investment opportunity based on fundamental strength, market position, and valuation metrics.

## Key Highlights

<mark>**Strong Financial Position**</mark>: The company maintains robust cash flows and a healthy balance sheet, providing flexibility for strategic investments and shareholder returns.

<mark>**Competitive Moat**</mark>: Strong brand equity and network effects create sustainable competitive advantages that are difficult for competitors to replicate.

## Financial Analysis

### Profitability Metrics
- **Return on Equity**: 25.4% (Industry avg: 15.2%)
- **Operating Margin**: 28.5% (Industry avg: 18.1%)
- **Free Cash Flow**: \$45.2B (up 12% YoY)

### Growth Drivers
1. **Core Business Expansion**: Primary revenue streams showing 15% CAGR over past 3 years
2. **New Initiatives**: Emerging business lines contributing \$8.5B in incremental revenue
3. **Market Share Gains**: Captured 3.2% additional market share in key segments

## Valuation Assessment

### Intrinsic Value Analysis
- **DCF Valuation**: \$185 per share (32% upside)
- **Comparable Multiples**: \$175 per share (25% upside)
- **Asset-Based**: \$160 per share (14% upside)

### Relative Valuation
| Metric | ${ticker} | Industry Median | Discount/Premium |
|--------|-----------|-----------------|-----------------|
| P/E | 24x | 28x | -14% |
| EV/EBITDA | 16x | 18x | -11% |
| P/B | 6.2x | 7.5x | -17% |

## Risk Factors

### Key Risks to Monitor
1. **Regulatory Uncertainty**: Pending legislation could impact margins by 2-3%
2. **Cyclicality**: Revenue sensitivity to macroeconomic conditions
3. **Competition**: Emerging competitors in adjacent markets

### Risk Mitigation
- Strong balance sheet provides buffer against downturns
- Diversified revenue streams reduce single-point dependency
- Management has track record of navigating challenging environments

## Investment Thesis

${ticker} represents an attractive opportunity for investors seeking:
- <mark>**Attractive valuation**</mark> relative to growth prospects
- <mark>**Quality management**</mark> with proven capital allocation
- <mark>**Catalyst visibility**</mark> over next 12-18 months

The risk/reward profile is favorable, with downside protected by strong fundamentals and upside driven by both operational improvements and multiple expansion.
`;
}

// Mock strategy analysis by strategy type
export function getMockStrategyAnalysis(ticker: string, strategy: ResearchStrategy): string {
  const strategyAnalyses: Record<ResearchStrategy, string> = {
    value: `# Value Investing Analysis: ${ticker}

## Benjamin Graham Framework

### Quantitative Screening
- **P/B Ratio**: 0.9x (Passes < 1.5x criteria)
- **P/E Ratio**: 9x (Significantly below market)
- **Current Ratio**: 2.1 (Adequate liquidity)
- **Debt/Equity**: 1.2 (Manageable leverage)

### Margin of Safety Analysis
Current Price: \$32.50
Conservative Liquidation Value: \$42.00
**Margin of Safety**: 29%

## Greenwald's Earnings Power Value

### Normalized Earnings: \$4.20/share
- Adjusted for cyclical factors
- 5-year average earnings power
- Conservative growth assumptions

### EPV Calculation: \$48/share
- Cost of capital: 9%
- Sustainable competitive advantages incorporated
- **Upside to current price**: 48%

### Key Value Metrics
| Metric | Value | Grade |
|--------|-------|-------|
| Asset Value | \$45/share | A |
| Earnings Power | \$48/share | A |
| Growth Value | \$52/share | B+ |
| **Overall** | **\$48/share** | **A-** |

<mark>**Value Verdict**</mark>: Strong value opportunity with significant margin of safety. Recommend position sizing of 4-5% of portfolio.`,
    'special-sits': `# Special Situations Analysis: ${ticker}

## Event-Driven Opportunity

### Thesis: Corporate Restructuring
${ticker} is undergoing a strategic transformation that is not fully appreciated by the market.

### Key Catalysts (Next 12 Months)

1. **Spin-Off Completion** (Timeline: Q2 2026)
   - Separation of non-core division
   - Estimated value unlock: \$8-12/share
   - Tax-free spin for shareholders

2. **Merger Arbitrage** (Timeline: Q4 2025)
   - Pending acquisition of strategic target
   - Spread: 6.8% (attractive risk/reward)
   - Deal probability: 85%

3. **Shareholder Activism** (Active)
   - Activist firm has accumulated 5.2% stake
   - Pushing for operational improvements
   - Track record: 3 successful campaigns, average +35% returns

### Risk/Reward Analysis

| Scenario | Probability | Price Target | Return |
|----------|-------------|--------------|--------|
| Base Case | 60% | \$58 | +28% |
| Upside | 25% | \$72 | +59% |
| Downside | 15% | \$44 | -3% |

**Expected Return**: +28%

<mark>**Special Situations Verdict**</mark>: Attractive risk/reward with multiple near-term catalysts. Recommend position sizing of 3-4% of portfolio.`,
    distressed: `# Distressed Investing Analysis: ${ticker}

## Turnaround Opportunity

### Current Situation
${ticker} faces temporary headwinds that have created an attractive entry point for contrarian investors.

### Cycle Analysis
- **Current Cycle Position**: Bottoming phase
- **Historical Recovery**: 18-24 months past trough
- **Sector Rotation**: Early signs of institutional interest

### Howard Marks' Checklist

| Factor | Status | Notes |
|--------|--------|-------|
| Market Fear | ✅ Pass | Extreme pessimism priced in |
| Quality Asset | ✅ Pass | Core business remains strong |
| Temporary Issues | ✅ Pass | Fixable operational problems |
| Catalyst Visibility | ✅ Pass | New CEO with turnaround track record |
| Balance Sheet | ⚠️ Caution | Elevated leverage manageable |

### Valuation at Cycle Bottom

### Distressed Cash Flow Analysis
- **Conservative Recovery Value**: \$28/share
- **Current Price**: \$19.50
- **Upside**: 43%

### Risk Management
- **Liquidity Position**: Adequate through 2026
- **Asset Coverage**: 1.8x debt at liquidation values
- **Recovery Timeline**: 12-18 months

<mark>**Distressed Verdict**</mark>: Contrarian opportunity with favorable risk/reward for patient capital. Recommend position sizing of 2-3% of portfolio.`,
    general: `# Comprehensive Investment Analysis: ${ticker}

## Investment Overview

This analysis provides a multi-dimensional assessment of ${ticker} across fundamental, technical, and qualitative factors.

## Fundamental Analysis

### Business Quality Assessment
- **Moat Rating**: Strong (8.5/10)
- **Management Quality**: Excellent (9/10)
- **Capital Allocation**: Prudent with significant buybacks
- **Industry Position**: #1 or #2 in all core segments

### Financial Health
- **Balance Sheet**: Investment grade, debt/EBITDA 2.1x
- **Cash Generation**: \$52B FCF annually
- **Returns on Capital**: ROIC of 18% (excellent)

## Growth Analysis

### Near-term Catalysts (1-2 years)
1. Product cycle refresh driving 8% revenue growth
2. Margin expansion from operational efficiencies
3. Share buybacks reducing float by 2% annually

### Long-term Growth Drivers (3-5 years)
1. Total Addressable Market expansion
2. New product categories
3. International market penetration

## Valuation Summary

### Scenario Analysis
| Scenario | Assumptions | Price Target | Probability |
|----------|-------------|--------------|-------------|
| Bull | Best case execution | \$245 | 30% |
| Base | Expected outcomes | \$195 | 50% |
| Bear | Challenging environment | \$160 | 20% |

**Expected Value**: \$198 (22% upside from current)

<mark>**Investment Verdict**</mark>: Attractive risk-adjusted returns with strong downside support and multiple upside drivers. Recommend position sizing of 4-5% of portfolio.`,
  };

  return strategyAnalyses[strategy] || strategyAnalyses.general;
}

// Mock skeptic critique
export function getMockSkepticCritique(ticker: string): string {
  return `# Skeptic's Critique: ${ticker}

## The Bear Case

While the bull case presents an attractive narrative, several critical concerns deserve careful attention.

## Fundamental Concerns

### 1. **Growth Deceleration Risk**
<mark>Revenue growth has declined for 5 consecutive quarters</mark>, suggesting the core business may be maturing faster than anticipated. Management's growth projections assume:
- Market expansion that may not materialize
- Successful product launches in competitive markets
- No meaningful competitive response

### 2. **Margin Pressure**
- Gross margins compressed 200bps YoY
- Operating expenses growing faster than revenue
- Competition forcing price concessions in key segments

### 3. **Valuation Concerns**
| Metric | Current | Historical Avg | Interpretation |
|--------|---------|----------------|----------------|
| P/E (Forward) | 24x | 18x | 33% premium |
| EV/Sales | 4.2x | 3.1x | 35% premium |
| FCF Yield | 3.2% | 5.1% | Below average |

<mark>**The market is pricing in perfection**</mark>. Any misstep will result in significant multiple compression.

## Hidden Risks

### Regulatory Exposure
Pending regulatory decisions could:
- Limit pricing power in key markets
- Require costly compliance investments
- Restrict expansion opportunities

### Competitive Dynamics
- Well-capitalized competitors increasing investment
- New entrants with disruptive technologies
- Customer concentration risk (top 3 customers = 45% of revenue)

## The Skeptic's Conclusion

**While ${ticker} is a quality business, the current price leaves no margin of safety.**

Recommend **WAIT** for:
1. Entry point 15-20% below current levels, OR
2. Clear evidence of growth re-acceleration, OR
3. Successful execution of key catalysts

The risk/reward at current levels is unfavorable: +25% upside vs. -35% downside. The odds do not justify an investment.`;
}

// Mock risk assessment
export function getMockRiskAssessment(ticker: string): string {
  return `# Risk Assessment: ${ticker}

## Risk Officer's Analysis

### Overall Risk Rating: **MEDIUM** (Amber Zone)

## Risk Factor Analysis

### 1. Market Risk ⚠️
**Level**: Medium
- **Beta**: 1.15 (systematic risk above market)
- **Sector Sensitivity**: High correlation to economic cycles
- **Revenue Volatility**: 3-year historical variance of 12%

### 2. Financial Risk ✅
**Level**: Low
- **Interest Coverage**: 8.5x (comfortable cushion)
- **Debt/EBITDA**: 2.1x (manageable leverage)
- **Liquidity Position**: \$28B cash & equivalents
- **Covenant Compliance**: All covenants comfortable

### 3. Business Risk ⚠️
**Level**: Medium

#### Concentration Risks
- **Customer Concentration**: Top 5 customers = 52% of revenue
- **Product Concentration**: Core product = 68% of revenue
- **Geographic Concentration**: North America = 72% of revenue

#### Competitive Risks
- **Market Share Erosion**: Lost 2.3% market share in key segment
- **Pricing Pressure**: Average selling prices down 4% YoY
- **Innovation Gap**: R&D spend below industry average

### 4. Execution Risk ⚠️
**Level**: Medium
- **Management Turnover**: CFO departed (role filled externally)
- **Integration Risk**: Recent acquisition has integration challenges
- **Technology Debt**: Legacy systems requiring significant investment

### 5. Regulatory & Legal Risk 🚨
**Level**: Medium-High
- **Pending Litigation**: 3 material cases with potential \$2B+ liability
- **Regulatory Review**: Under investigation for antitrust concerns
- **Policy Risk**: Potential for adverse regulatory changes

## Scenario Analysis

| Scenario | Probability | Impact | Expected Loss |
|----------|-------------|--------|---------------|
| Base Case | 60% | 0% | 0% |
| Downside Mild | 25% | -20% | -5% |
| Downside Severe | 10% | -40% | -4% |
| Tail Risk | 5% | -70% | -3.5% |

**Expected Value of Tail Risk**: -12.5%

## Risk Mitigation Recommendations

### Portfolio Level
1. **Position Sizing**: Limit to 3-4% of portfolio (vs. typical 5%)
2. **Correlation Management**: Reduce exposure to similar secular growth names
3. **Hedging**: Consider protective puts given elevated volatility

### Monitoring Triggers
**Sell/Reduce Position If:**
- Revenue growth falls below 5% for two consecutive quarters
- Gross margins compress >100bps YoY
- Key customer concentration exceeds 60%
- Regulatory material adverse ruling

<mark>**Risk Officer's Verdict**</mark>: APPROVE for investment with position sizing limitations and enhanced monitoring protocols. The quality of the business and financial strength provide adequate downside protection, but elevated execution and regulatory risks warrant careful position management.`;
}

// Mock verdict
export function getMockVerdict(topPick: string): string {
  return `## Investment Verdict

### Decision
🎯 **INVEST** with **78%** conviction

### Top Recommendation: **${topPick}**

### Rationale

After comprehensive analysis including deep research, strategy-specific evaluation, skeptical critique, and risk assessment, ${topPick} emerges as the most attractive opportunity among the candidates.

### Key Investment Merits

1. **Attractive Valuation**: Trading at a 25% discount to intrinsic value
2. **Quality Business**: Strong competitive positioning with durable moats
3. **Catalyst Visibility**: Multiple near-term catalysts (3-12 months)
4. **Downside Protection**: Strong balance sheet and asset base limit downside
5. **Management Quality**: Proven capital allocators with strong track record

### Risk/Reward Profile

| Scenario | Probability | Return | Expected Value |
|----------|-------------|--------|----------------|
| Bull | 30% | +45% | +13.5% |
| Base | 50% | +25% | +12.5% |
| Bear | 20% | -15% | -3.0% |

**Expected Return**: +23%

### Position Sizing Recommendation
- **Conservative**: 2-3% of portfolio
- **Moderate**: 3-4% of portfolio
- **Aggressive**: 4-5% of portfolio

### Entry Strategy
1. **Initial Position**: 60% of intended position size
2. **Add on Weakness**: Add 20% if price drops 5-8%
3. **Final Tranche**: Add remaining 20% if price drops 10-12%

### Exit Strategy (Price Targets)
- **Initial Take Profits**: At +30% (sell 25% of position)
- **Second Take Profits**: At +50% (sell another 25% of position)
- **Hold Core**: Remainder for long-term appreciation

### Monitoring Requirements
Review position quarterly or if any material events occur (earnings misses, management changes, regulatory developments).

---

**Analysis Completed**: ${new Date().toLocaleDateString()}
**Next Review**: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}`;
}

// Mock final verdict object
export function getMockFinalVerdict(topPick: string) {
  return {
    decision: 'invest' as const,
    confidence: 78,
    topPick,
    rationale: `After comprehensive analysis, ${topPick} offers the best risk-adjusted returns with 25% upside to intrinsic value, strong downside protection, and multiple near-term catalysts.`,
    analyzed: MOCK_DISCOVERED_OPPORTUNITIES.map(opp => ({
      ticker: opp.ticker,
      score: opp.score,
      verdict: opp.ticker === topPick ? 'invest' : opp.score > 75 ? 'watch' : 'pass',
    })),
    timestamp: new Date().toISOString(),
  };
}

// SSE event generator for thesis-start endpoint
export async function* generateMockThesisStartEvents(strategy: ResearchStrategy) {
  const delays = [500, 1000, 1500, 2000];

  // Discovering phase
  yield { type: 'status', stage: 'discovering', message: 'Discovering investment opportunities from your thesis...' };
  await sleep(delays[0]);

  yield { type: 'status', stage: 'discovered', message: `Discovered ${MOCK_DISCOVERED_OPPORTUNITIES.length} opportunities` };
  await sleep(delays[1]);

  // Researching phase
  yield { type: 'status', stage: 'researching', message: 'Researching each opportunity with Gemini Deep Research...' };
  await sleep(delays[2]);

  // Progress for each opportunity
  for (let i = 0; i < MOCK_DISCOVERED_OPPORTUNITIES.length; i++) {
    const opp = MOCK_DISCOVERED_OPPORTUNITIES[i];
    yield {
      type: 'progress',
      current: i + 1,
      total: MOCK_DISCOVERED_OPPORTUNITIES.length,
      ticker: opp.ticker,
      stage: 'researching',
    };
    await sleep(1500);

    yield {
      type: 'progress',
      current: i + 1,
      total: MOCK_DISCOVERED_OPPORTUNITIES.length,
      ticker: opp.ticker,
      stage: 'analyzing',
      message: 'Running strategy and critique analysis...',
    };
    await sleep(2000);
  }

  // Final verdict
  const topPick = MOCK_DISCOVERED_OPPORTUNITIES[0].ticker;
  yield {
    type: 'verdict',
    ...getMockFinalVerdict(topPick),
  };
  await sleep(500);

  // Complete
  yield {
    type: 'complete',
    summary: {
      totalAnalyzed: MOCK_DISCOVERED_OPPORTUNITIES.length,
      verdicts: {
        invest: 1,
        watch: 1,
        pass: 1,
      },
    },
    duration: '4.5 minutes',
    opportunities: MOCK_DISCOVERED_OPPORTUNITIES.map(opp => ({
      ticker: opp.ticker,
      companyName: opp.companyName,
      score: opp.score,
      verdict: opp.ticker === topPick ? 'invest' : opp.score > 75 ? 'watch' : 'pass',
    })),
  };
}

// SSE event generator for specialized research endpoint
export async function* generateMockSpecializedEvents(strategy: ResearchStrategy) {
  const topPick = MOCK_DISCOVERED_OPPORTUNITIES[0];
  const ticker = topPick.ticker;

  // Starting
  yield { phase: 'starting', timestamp: new Date().toISOString() };
  await sleep(500);

  // Researching
  yield {
    phase: 'researching',
    agent: 'gemini',
    content: getMockResearchReport(ticker),
    timestamp: new Date().toISOString(),
  };
  await sleep(2000);

  // Strategy analysis
  yield {
    phase: 'strategy_analysis',
    agent: strategy,
    content: getMockStrategyAnalysis(ticker, strategy),
    timestamp: new Date().toISOString(),
  };
  await sleep(1500);

  // Critique - Skeptic
  yield {
    phase: 'critique',
    agent: 'skeptic',
    content: getMockSkepticCritique(ticker),
    timestamp: new Date().toISOString(),
  };
  await sleep(1500);

  // Critique - Risk Officer
  yield {
    phase: 'critique',
    agent: 'risk-officer',
    content: getMockRiskAssessment(ticker),
    timestamp: new Date().toISOString(),
  };
  await sleep(1500);

  // Verdict
  yield {
    phase: 'verdict',
    agent: 'verdict',
    content: getMockVerdict(ticker),
    timestamp: new Date().toISOString(),
  };
  await sleep(500);

  // Complete with all results
  yield {
    phase: 'complete',
    content: JSON.stringify({
      researchReport: getMockResearchReport(ticker),
      strategyAnalysis: getMockStrategyAnalysis(ticker, strategy),
      skepticCritique: getMockSkepticCritique(ticker),
      riskAssessment: getMockRiskAssessment(ticker),
      verdict: getMockVerdict(ticker),
      strategy,
      agentUsed: strategy,
    }),
    timestamp: new Date().toISOString(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility to check if test mode is enabled (server-side)
export function isTestMode(): boolean {
  return process.env.TEST_MODE === 'true';
}

// Client-side check (requires NEXT_PUBLIC_ prefix)
export function isTestModeClient(): boolean {
  return typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_TEST_MODE === 'true';
}
