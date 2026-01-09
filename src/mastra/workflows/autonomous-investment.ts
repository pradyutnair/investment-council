/**
 * Autonomous Investment Workflow
 *
 * End-to-end workflow that:
 * 1. Discovers opportunities using screener agents
 * 2. Researches each opportunity using Gemini
 * 3. Gets strategy agent analysis
 * 4. Runs critiques (Skeptic + Risk Officer)
 * 5. Produces final verdict (if enabled)
 *
 * This is the complete autonomous investment analysis pipeline.
 */

import { runOpportunityDiscovery, type Opportunity } from './opportunity-discovery';
import { runResearchAndCritique, runResearchAndCritiqueBatch, type ResearchCritiqueOutput } from './research-critique';
import { verdictAgent } from '../agents/verdict-agent';

export interface AutonomousInvestmentInput {
  discoveryTypes: ('value' | 'special-sits' | 'distressed' | 'market-movers')[];
  maxOpportunities?: number;
  maxResearchDepth?: number; // How many to fully research
  includeCritiques?: boolean;
  includeVerdict?: boolean;
  concurrency?: number;
}

export interface AnalyzedOpportunity extends ResearchCritiqueOutput {
  verdict?: string;
  finalScore?: number;
}

export interface AutonomousInvestmentOutput {
  discovered: Opportunity[];
  analyzed: AnalyzedOpportunity[];
  summary: {
    totalDiscovered: number;
    totalAnalyzed: number;
    investCount: number;
    passCount: number;
    watchCount: number;
    topOpportunities: string[];
  };
  duration: number;
}

/**
 * Parse verdict from verdict agent response
 */
function parseVerdict(verdictText: string): { decision: string; confidence: number; score: number } {
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
 * Generate final verdict for an analyzed opportunity
 */
async function generateVerdict(analyzed: ResearchCritiqueOutput): Promise<string | undefined> {
  if (!analyzed.researchReport) {
    return undefined;
  }

  try {
    const verdictContext = `# Investment Verdict Request

## Company
${analyzed.opportunity.companyName} (${analyzed.opportunity.ticker})

## Original Thesis
${analyzed.opportunity.thesis}

## Research Report
${analyzed.researchReport}
${analyzed.strategyAnalysis ? `\n\n## Strategy Agent Analysis\n${analyzed.strategyAnalysis}` : ''}
${analyzed.critiques ? `\n\n## Skeptic's Critique\n${analyzed.critiques.skeptic?.content ?? 'N/A'}\n\n## Risk Officer's Assessment\n${analyzed.critiques.risk_officer?.content ?? 'N/A'}` : ''}

---

Please provide your final investment verdict following your required format.`;

    const result = await verdictAgent.generate(verdictContext);
    return result.text;
  } catch (error) {
    console.error(`Verdict generation failed for ${analyzed.opportunity.ticker}:`, error);
    return undefined;
  }
}

/**
 * Main autonomous investment workflow
 */
export async function runAutonomousInvestmentWorkflow(
  input: AutonomousInvestmentInput
): Promise<AutonomousInvestmentOutput> {
  const startTime = Date.now();

  const {
    discoveryTypes,
    maxOpportunities = 20,
    maxResearchDepth = 5,
    includeCritiques = true,
    includeVerdict = true,
    concurrency = 3,
  } = input;

  // Phase 1: Discover opportunities
  console.log('Phase 1: Discovering opportunities...');
  const discoveryResult = await runOpportunityDiscovery({
    discoveryTypes,
    maxResults: maxOpportunities,
    enrichWithMetrics: true,
  });

  console.log(`Discovered ${discoveryResult.opportunities.length} opportunities`);

  // Phase 2: Research and critique top opportunities
  console.log(`Phase 2: Researching top ${maxResearchDepth} opportunities...`);
  const topOpportunities = discoveryResult.opportunities.slice(0, maxResearchDepth);

  const analyzed = await runResearchAndCritiqueBatch(topOpportunities, {
    includeSkeptic: includeCritiques,
    includeRiskOfficer: includeCritiques,
    includeStrategyAgent: true,
    concurrency,
  });

  // Phase 3: Generate verdicts (if enabled)
  let analyzedWithVerdict: AnalyzedOpportunity[] = analyzed;
  if (includeVerdict) {
    console.log('Phase 3: Generating final verdicts...');
    analyzedWithVerdict = await Promise.all(
      analyzed.map(async (a) => {
        const verdict = await generateVerdict(a);

        let finalScore: number | undefined;
        if (verdict) {
          const parsed = parseVerdict(verdict);
          finalScore = parsed.score;
        }

        return {
          ...a,
          verdict,
          finalScore,
        };
      })
    );
  }

  // Phase 4: Sort by final score and summarize
  const sorted = analyzedWithVerdict.sort((a, b) => {
    const scoreA = a.finalScore ?? 0;
    const scoreB = b.finalScore ?? 0;
    return scoreB - scoreA;
  });

  // Generate summary
  let investCount = 0;
  let passCount = 0;
  let watchCount = 0;
  const topOpportunityNames: string[] = [];

  for (const a of sorted) {
    if (a.verdict) {
      const { decision } = parseVerdict(a.verdict);
      if (decision === 'INVEST') {
        investCount++;
        if (topOpportunityNames.length < 3) {
          topOpportunityNames.push(`${a.opportunity.ticker} (${a.opportunity.companyName})`);
        }
      } else if (decision === 'PASS') {
        passCount++;
      } else {
        watchCount++;
      }
    }
  }

  const summary = {
    totalDiscovered: discoveryResult.totalDiscovered,
    totalAnalyzed: analyzed.length,
    investCount,
    passCount,
    watchCount,
    topOpportunities: topOpportunityNames,
  };

  const duration = Date.now() - startTime;

  console.log('\n=== Workflow Complete ===');
  console.log(`Discovered: ${summary.totalDiscovered} opportunities`);
  console.log(`Analyzed: ${summary.totalAnalyzed} opportunities`);
  console.log(`Verdicts: ${summary.investCount} INVEST, ${summary.passCount} PASS, ${summary.watchCount} WATCH`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);

  return {
    discovered: discoveryResult.opportunities,
    analyzed: sorted,
    summary,
    duration,
  };
}

/**
 * Quick analysis for a single ticker (for manual input)
 */
export async function analyzeSingleOpportunity(
  ticker: string,
  thesis: string,
  options: {
    companyName?: string;
    type?: string;
    includeCritiques?: boolean;
    includeVerdict?: boolean;
  } = {}
): Promise<AnalyzedOpportunity> {
  const {
    companyName = ticker,
    type = 'value',
    includeCritiques = true,
    includeVerdict = true,
  } = options;

  const opportunity: Opportunity = {
    ticker,
    companyName,
    type,
    thesis,
    keyMetrics: {},
    riskLevel: 'medium',
    discoveredBy: 'manual',
  };

  const analyzed = await runResearchAndCritique({
    opportunity,
    includeSkeptic: includeCritiques,
    includeRiskOfficer: includeCritiques,
    includeStrategyAgent: true,
  });

  let result: AnalyzedOpportunity = analyzed;

  if (includeVerdict) {
    const verdict = await generateVerdict(analyzed);
    let finalScore: number | undefined;
    if (verdict) {
      const parsed = parseVerdict(verdict);
      finalScore = parsed.score;
    }

    result = {
      ...analyzed,
      verdict,
      finalScore,
    };
  }

  return result;
}
