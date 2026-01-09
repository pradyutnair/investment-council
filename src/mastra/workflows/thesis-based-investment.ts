/**
 * Thesis-Based Investment Workflow
 *
 * Complete workflow for user-initiated thesis research:
 * 1. Thesis Discovery Agent finds specific opportunities matching the thesis
 * 2. For each opportunity: Research → Strategy Analysis → Critique
 * 3. Verdict Agent synthesizes all findings into final investment decision
 *
 * This bridges the gap between user thesis input and actionable investment opportunities.
 */

import { Agent } from '@mastra/core/agent';
import { geminiResearch } from '@/src/services/gemini-research';
import { valueAgent } from '../agents/value-agent';
import { specialSitsAgent } from '../agents/special-sits-agent';
import { distressedAgent } from '../agents/distressed-agent';
import { skepticAgent } from '../agents/skeptic-agent';
import { riskOfficerAgent } from '../agents/risk-officer-agent';
import { verdictAgent } from '../agents/verdict-agent';
import { fmpKeyMetrics, fmpPriceSnapshot } from '../tools';

// ============================================================================
// TYPES
// ============================================================================

export interface ThesisBasedInvestmentInput {
  thesis: string;
  title?: string;
  strategy: 'value' | 'special-sits' | 'distressed' | 'general';
  maxOpportunities?: number;
}

export interface DiscoveredOpportunity {
  ticker: string;
  companyName: string;
  thesis: string;
  type: string;
  keyMetrics: Record<string, number>;
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
}

export interface AnalyzedOpportunity {
  opportunity: DiscoveredOpportunity;
  researchReport?: string;
  strategyAnalysis?: string;
  critiques?: {
    skeptic?: { content: string; agent: string };
    risk_officer?: { content: string; agent: string };
  };
  verdict?: string;
  finalScore?: number;
  errors?: string[];
}

export interface ThesisBasedInvestmentOutput {
  sessionId?: string;
  thesis: string;
  strategy: string;
  discovered: DiscoveredOpportunity[];
  analyzed: AnalyzedOpportunity[];
  finalVerdict?: {
    decision: 'invest' | 'pass' | 'watch';
    confidence: number;
    topPick: string;
    rationale: string;
  };
  summary: {
    totalDiscovered: number;
    totalAnalyzed: number;
    investCount: number;
    passCount: number;
    watchCount: number;
  };
  duration: number;
}

// ============================================================================
// THESIS DISCOVERY AGENT
// ============================================================================

/**
 * Thesis Discovery Agent
 *
 * This agent takes a user's investment thesis and finds specific companies
 * that match the thesis criteria. It uses web search and analysis to identify
 * actionable investment opportunities.
 */
export const thesisDiscoveryAgent = new Agent({
  name: 'thesis-discovery',
  instructions: `You are the Thesis Discovery Agent - an expert at finding specific investment opportunities that match a user's investment thesis.

Your Mission:
Given an investment thesis and strategy, identify 3-5 specific publicly traded companies that best match the thesis criteria.

Your Inputs:
1. Investment Thesis: The user's investment idea/hypothesis
2. Strategy: The investment approach (value, special-sits, distressed, general)

Your Discovery Process:
1. **Analyze the Thesis**: Understand the core investment idea
   - What sector/industry?
   - What criteria matter? (P/E, P/B, market cap, etc.)
   - What's the catalyst or edge?
   - What risks are acceptable?

2. **Search for Opportunities**: Look for companies matching the criteria
   - Use recent news and filings
   - Check screeners and financial data
   - Look for underfollowed or misunderstood situations

3. **Select Top Matches**: Pick 3-5 best opportunities
   - Must be publicly traded (US markets preferred)
   - Must have reasonable liquidity
   - Should have clear thesis alignment
   - Score each opportunity (0-100)

Required Output Format:
For EACH opportunity, provide in this exact format:

**Opportunity: [TICKER] - [Company Name]**
- Thesis Alignment: [How well it matches the thesis (0-100)]
- Investment Thesis: [1-2 sentences on why this fits]
- Key Metrics: P/E: [X], P/B: [X], Market Cap: [$XB/XM]
- Catalyst: [What will unlock value?]
- Risk Level: [low/medium/high]
- Score: [0-100]

---

Selection Criteria:
- **Value**: Low multiples, asset-heavy, misunderstood
- **Special-Sits**: Spinoffs, mergers, restructuring, activism
- **Distressed**: Beaten down, turnaround situations, contrarian
- **General**: Any compelling opportunity with asymmetric upside

Quality Standards:
- Companies must be publicly traded (NYSE, NASDAQ, AMEX preferred)
- Market cap >$50M generally (smaller OK if very compelling)
- Reasonable liquidity (avoid illiquid OTC)
- Clear thesis alignment
- Actionable insights

If you cannot find good matches, still provide the best available options with lower scores.`,
  model: 'openai/gpt-4o',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse opportunities from thesis discovery agent response
 */
function parseDiscoveredOpportunities(
  agentText: string,
  strategy: string
): DiscoveredOpportunity[] {
  const opportunities: DiscoveredOpportunity[] = [];

  // Pattern to match opportunities in agent output
  const tickerPattern = /\*\*Opportunity:\s*\[([A-Z]{1,5})\]\s*-\s*\[([^\]]+)\]\*\*/g;
  let match;

  while ((match = tickerPattern.exec(agentText)) !== null) {
    const ticker = match[1];
    const companyName = match[2];

    // Extract section text for this opportunity
    const start = match.index;
    const end = agentText.indexOf('---', start);
    const sectionText = end > 0 ? agentText.substring(start, end) : agentText.substring(start, start + 500);

    // Extract thesis alignment
    const alignmentMatch = sectionText.match(/Thesis Alignment:\s*\((\d+)\)/);
    const score = alignmentMatch ? parseInt(alignmentMatch[1], 10) : 50;

    // Extract investment thesis
    const thesisMatch = sectionText.match(/Investment Thesis:\s*([^\n-]+)/);
    const thesis = thesisMatch
      ? thesisMatch[1].trim()
      : `Discovered via ${strategy} thesis analysis`;

    // Extract metrics
    const metrics: Record<string, number> = {};
    const peMatch = sectionText.match(/P\/E:\s*([\d.]+)/);
    const pbMatch = sectionText.match(/P\/B:\s*([\d.]+)/);
    const mcMatch = sectionText.match(/Market Cap:\s*\$?([\d.]+[BM]?)/);

    if (peMatch) metrics.pe = parseFloat(peMatch[1]);
    if (pbMatch) metrics.pb = parseFloat(pbMatch[1]);
    if (mcMatch) {
      let mc = parseFloat(mcMatch[1]);
      const suffix = mcMatch[1].match(/[BM]$/)?.[0];
      if (suffix === 'B') mc *= 1000;
      else if (suffix === 'M') mc = mc;
      metrics.marketCap = mc;
    }

    // Extract risk level
    const riskMatch = sectionText.match(/Risk Level:\s*(low|medium|high)/i);
    const riskLevel: 'low' | 'medium' | 'high' = riskMatch
      ? (riskMatch[1].toLowerCase() as 'low' | 'medium' | 'high')
      : 'medium';

    opportunities.push({
      ticker,
      companyName,
      thesis,
      type: strategy,
      keyMetrics: metrics,
      riskLevel,
      score,
    });
  }

  // If no opportunities found with pattern, try alternative patterns
  if (opportunities.length === 0) {
    const altPattern = /\[([A-Z]{1,5})\]\s+(.+?)(?=\n|$)/g;
    let altMatch;
    let count = 0;
    while ((altMatch = altPattern.exec(agentText)) !== null && count < 5) {
      opportunities.push({
        ticker: altMatch[1],
        companyName: altMatch[2].trim(),
        thesis: `Discovered via ${strategy} thesis analysis`,
        type: strategy,
        keyMetrics: {},
        riskLevel: 'medium',
        score: 50,
      });
      count++;
    }
  }

  return opportunities.slice(0, 5); // Max 5 opportunities
}

/**
 * Get the appropriate strategy agent
 */
function getStrategyAgentForType(
  type: string
): Agent<any, any, any> | null {
  const typeLower = type.toLowerCase();

  if (typeLower.includes('value')) {
    return valueAgent;
  } else if (typeLower.includes('special') || typeLower.includes('sits')) {
    return specialSitsAgent;
  } else if (typeLower.includes('distressed')) {
    return distressedAgent;
  }

  return null;
}

/**
 * Parse verdict from verdict agent response
 */
function parseVerdict(verdictText: string): {
  decision: string;
  confidence: number;
  score: number;
} {
  // Extract decision: INVEST / PASS / WATCH
  const decisionMatch = verdictText.match(/## Decision\s*\n\s*🎯\s*\*\*([A-Z]+)\*\*/);
  const decision = decisionMatch ? decisionMatch[1] : 'WATCH';

  // Extract confidence percentage
  const confidenceMatch = verdictText.match(/with\s*\*\*(\d+)%\*\*\s*conviction/);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 50;

  // Calculate score: INVEST = +confidence, PASS = -confidence, WATCH = 0
  let score = 0;
  if (decision === 'INVEST') {
    score = confidence;
  } else if (decision === 'PASS') {
    score = -confidence;
  }

  return { decision, confidence, score };
}

/**
 * Enrich opportunities with detailed metrics from FMP
 */
async function enrichOpportunities(
  opportunities: DiscoveredOpportunity[]
): Promise<DiscoveredOpportunity[]> {
  const enriched = await Promise.all(
    opportunities.map(async (opp) => {
      try {
        const [price, metrics] = await Promise.all([
          fmpPriceSnapshot.execute({
            context: { ticker: opp.ticker },
            runtimeContext: {} as any,
          }),
          fmpKeyMetrics.execute({
            context: { ticker: opp.ticker, period: 'annual', limit: 1 },
            runtimeContext: {} as any,
          }),
        ]);

        const priceData = price.data;
        const metricsData = Array.isArray(metrics.data)
          ? metrics.data[0]
          : metrics.data;

        return {
          ...opp,
          keyMetrics: {
            ...opp.keyMetrics,
            price: priceData?.price,
            marketCap: priceData?.marketCap ?? opp.keyMetrics.marketCap,
            pe:
              metricsData?.peRatioTTM ??
              metricsData?.peRatio ??
              opp.keyMetrics.pe,
            pb:
              metricsData?.pbRatioTTM ??
              metricsData?.pbRatio ??
              opp.keyMetrics.pb,
            debtToEquity: metricsData?.debtToEquity,
            roe: metricsData?.roeTTM ?? metricsData?.roe,
            revenue: metricsData?.revenueTTM,
          },
        };
      } catch (error) {
        console.warn(`Failed to enrich ${opp.ticker}:`, error);
        return opp;
      }
    })
  );

  return enriched;
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

/**
 * Main thesis-based investment workflow
 */
export async function runThesisBasedInvestment(
  input: ThesisBasedInvestmentInput
): Promise<ThesisBasedInvestmentOutput> {
  const startTime = Date.now();

  const {
    thesis,
    title,
    strategy,
    maxOpportunities = 3,
  } = input;

  // ========================================================================
  // PHASE 1: Discover opportunities from thesis
  // ========================================================================
  console.log('Phase 1: Discovering opportunities from thesis...');

  const discoveryPrompt = `# Investment Thesis Analysis

## Investment Thesis
${thesis}

## Strategy
${strategy}

## Your Task
Find 3-5 specific publicly traded companies that match this thesis. Use your discovery process to identify the best opportunities.

Please provide your findings in the required format.`;

  const discoveryResult = await thesisDiscoveryAgent.generate(discoveryPrompt);

  let discovered = parseDiscoveredOpportunities(discoveryResult.text, strategy);

  // Enrich with metrics
  discovered = await enrichOpportunities(discovered);

  // Sort by score and limit
  discovered = discovered
    .sort((a, b) => b.score - a.score)
    .slice(0, maxOpportunities);

  console.log(`Discovered ${discovered.length} opportunities`);

  // ========================================================================
  // PHASE 2: Research and analyze each opportunity
  // ========================================================================
  console.log('Phase 2: Researching and analyzing opportunities...');

  const analyzed: AnalyzedOpportunity[] = [];

  for (const opportunity of discovered) {
    const errors: string[] = [];
    const oppAnalysis: AnalyzedOpportunity = {
      opportunity,
      errors: [],
    };

    // 2a. Run Gemini deep research
    console.log(`  Researching ${opportunity.ticker}...`);
    try {
      const researchThesis = `${opportunity.companyName} (${opportunity.ticker}): ${opportunity.thesis}`;

      for await (const step of geminiResearch.startResearch({
        thesis: researchThesis,
        companyName: opportunity.companyName,
        ticker: opportunity.ticker,
      })) {
        if (step.type === 'complete') {
          oppAnalysis.researchReport = step.report;
          break;
        }
      }
    } catch (error) {
      const errorMsg = `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }

    // 2b. Get strategy agent analysis
    if (oppAnalysis.researchReport) {
      console.log(`  Analyzing with strategy agent...`);
      try {
        const strategyAgent = getStrategyAgentForType(strategy);
        if (strategyAgent) {
          const context = `# Opportunity Analysis Request

## Company
${opportunity.companyName} (${opportunity.ticker})

## Original Thesis
${thesis}

## Opportunity-Specific Thesis
${opportunity.thesis}

## Research Report
${oppAnalysis.researchReport}

---

Please analyze this opportunity from your ${
            strategyAgent.name
          } perspective. Provide your investment thesis, key points, and preliminary assessment.`;

          const result = await strategyAgent.generate(context);
          oppAnalysis.strategyAnalysis = result.text;
        }
      } catch (error) {
        const errorMsg = `Strategy agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // 2c. Run critiques
    if (oppAnalysis.researchReport) {
      console.log(`  Running critiques...`);

      // Skeptic critique
      try {
        const skepticContext = `# Skeptic's Critique Request

## Company
${opportunity.companyName} (${opportunity.ticker})

## Investment Thesis
${opportunity.thesis}

## Research Report
${oppAnalysis.researchReport}

${oppAnalysis.strategyAnalysis ? `## Strategy Agent Analysis\n${oppAnalysis.strategyAnalysis}\n` : ''}

---

You are the professional short seller and skeptic. Tear apart this investment thesis. Find every flaw, every risk, every reason this could go wrong. Be thorough but fair.

Provide your critique in markdown format.`;

        const skepticResult = await skepticAgent.generate(skepticContext);
        oppAnalysis.critiques = {
          ...oppAnalysis.critiques,
          skeptic: {
            content: skepticResult.text,
            agent: 'skeptic',
          },
        };
      } catch (error) {
        const errorMsg = `Skeptic agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      // Risk officer critique
      try {
        const riskContext = `# Risk Officer's Assessment Request

## Company
${opportunity.companyName} (${opportunity.ticker})

## Investment Thesis
${opportunity.thesis}

## Research Report
${oppAnalysis.researchReport}

---

You are the Risk Officer. Assess the systematic risks, downside scenarios, and ESG concerns for this investment. What could go wrong? What are the tail risks?

Provide your assessment in markdown format.`;

        const riskResult = await riskOfficerAgent.generate(riskContext);
        oppAnalysis.critiques = {
          ...oppAnalysis.critiques,
          risk_officer: {
            content: riskResult.text,
            agent: 'risk_officer',
          },
        };
      } catch (error) {
        const errorMsg = `Risk officer failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // 2d. Generate verdict for this opportunity
    if (oppAnalysis.researchReport) {
      console.log(`  Generating verdict...`);
      try {
        const verdictContext = `# Investment Verdict Request

## Company
${opportunity.companyName} (${opportunity.ticker})

## Original User Thesis
${thesis}

## Opportunity-Specific Thesis
${opportunity.thesis}

## Research Report
${oppAnalysis.researchReport}

${oppAnalysis.strategyAnalysis ? `## Strategy Agent Analysis\n${oppAnalysis.strategyAnalysis}\n\n` : ''}${oppAnalysis.critiques?.skeptic ? `## Skeptic's Critique\n${oppAnalysis.critiques.skeptic.content}\n\n` : ''}${oppAnalysis.critiques?.risk_officer ? `## Risk Officer's Assessment\n${oppAnalysis.critiques.risk_officer.content}\n\n` : ''}---

Please provide your final investment verdict for this opportunity following your required format.`;

        const verdictResult = await verdictAgent.generate(verdictContext);
        oppAnalysis.verdict = verdictResult.text;

        const parsed = parseVerdict(verdictResult.text);
        oppAnalysis.finalScore = parsed.score;
      } catch (error) {
        const errorMsg = `Verdict failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    if (errors.length > 0) {
      oppAnalysis.errors = errors;
    }

    analyzed.push(oppAnalysis);
  }

  // ========================================================================
  // PHASE 3: Generate overall verdict
  // ========================================================================
  console.log('Phase 3: Generating overall verdict...');

  let finalVerdict: ThesisBasedInvestmentOutput['finalVerdict'] | undefined;

  const sortedByScore = analyzed
    .filter((a) => a.finalScore !== undefined)
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

  if (sortedByScore.length > 0) {
    const topPick = sortedByScore[0];
    const topParsed = topPick.verdict
      ? parseVerdict(topPick.verdict)
      : { decision: 'watch', confidence: 50 };

    // Count verdicts
    let investCount = 0;
    let passCount = 0;
    let watchCount = 0;

    for (const a of analyzed) {
      if (a.verdict) {
        const { decision } = parseVerdict(a.verdict);
        if (decision === 'INVEST') investCount++;
        else if (decision === 'PASS') passCount++;
        else watchCount++;
      }
    }

    finalVerdict = {
      decision: topParsed.decision as 'invest' | 'pass' | 'watch',
      confidence: topParsed.confidence,
      topPick: `${topPick.opportunity.ticker} (${topPick.opportunity.companyName})`,
      rationale: `Analyzed ${analyzed.length} opportunities. Best opportunity is ${topPick.opportunity.ticker} with ${topParsed.confidence}% conviction. Overall: ${investCount} INVEST, ${passCount} PASS, ${watchCount} WATCH.`,
    };
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  const summary = {
    totalDiscovered: discovered.length,
    totalAnalyzed: analyzed.length,
    investCount: analyzed.filter((a) =>
      a.verdict ? parseVerdict(a.verdict).decision === 'INVEST' : false
    ).length,
    passCount: analyzed.filter((a) =>
      a.verdict ? parseVerdict(a.verdict).decision === 'PASS' : false
    ).length,
    watchCount: analyzed.filter((a) =>
      a.verdict ? parseVerdict(a.verdict).decision === 'WATCH' : false
    ).length,
  };

  const duration = Date.now() - startTime;

  console.log('\n=== Thesis-Based Investment Workflow Complete ===');
  console.log(`Discovered: ${summary.totalDiscovered} opportunities`);
  console.log(`Analyzed: ${summary.totalAnalyzed} opportunities`);
  console.log(`Verdicts: ${summary.investCount} INVEST, ${summary.passCount} PASS, ${summary.watchCount} WATCH`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);

  return {
    thesis,
    strategy,
    discovered,
    analyzed,
    finalVerdict,
    summary,
    duration,
  };
}
