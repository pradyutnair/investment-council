/**
 * Research and Critique Workflow
 *
 * Orchestrates the complete research and critique process:
 * 1. Run Gemini deep research
 * 2. Get strategy agent analysis (value/special-sits/distressed)
 * 3. Run critiques (Skeptic + Risk Officer)
 * 4. Return complete analysis package
 */

import { geminiResearch } from '@/src/services/gemini-research';
import { runCouncilCritique } from './council-critique';
import { valueAgent } from '../agents/value-agent';
import { specialSitsAgent } from '../agents/special-sits-agent';
import { distressedAgent } from '../agents/distressed-agent';
import type { ContextFile } from '@/src/types/deals';
import type { DealCritiques } from '@/src/types/deals';

export interface Opportunity {
  ticker: string;
  companyName: string;
  type: string;
  thesis: string;
  keyMetrics?: Record<string, number>;
}

export interface ResearchCritiqueInput {
  opportunity: Opportunity;
  includeSkeptic?: boolean;
  includeRiskOfficer?: boolean;
  includeStrategyAgent?: boolean;
  contextFiles?: ContextFile[];
}

export interface ResearchCritiqueOutput {
  opportunity: Opportunity;
  researchReport?: string;
  strategyAnalysis?: string;
  critiques?: DealCritiques;
  duration: number;
  errors?: string[];
}

/**
 * Run complete research and critique workflow
 */
export async function runResearchAndCritique(input: ResearchCritiqueInput): Promise<ResearchCritiqueOutput> {
  const startTime = Date.now();
  const errors: string[] = [];

  const {
    opportunity,
    includeSkeptic = true,
    includeRiskOfficer = true,
    includeStrategyAgent = true,
    contextFiles = [],
  } = input;

  // Phase 1: Run Gemini deep research
  let researchReport: string | undefined;
  try {
    const thesis = `${opportunity.companyName} (${opportunity.ticker}): ${opportunity.thesis}`;

    let fullReport = '';
    for await (const step of geminiResearch.startResearch({
      thesis,
      companyName: opportunity.companyName,
      ticker: opportunity.ticker,
      contextFiles,
    })) {
      if (step.type === 'complete') {
        fullReport = step.report;
        break;
      }
    }

    researchReport = fullReport;
  } catch (error) {
    const errorMsg = `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error(errorMsg);
  }

  // Phase 2: Get strategy agent analysis (if enabled and report exists)
  let strategyAnalysis: string | undefined;
  if (includeStrategyAgent && researchReport) {
    try {
      const strategyAgent = getStrategyAgentForType(opportunity.type);
      if (strategyAgent) {
        const context = `# Opportunity Analysis Request

## Company
${opportunity.companyName} (${opportunity.ticker})

## Opportunity Thesis
${opportunity.thesis}

## Research Report
${researchReport}

---

Please analyze this opportunity from your ${strategyAgent.name} perspective. Provide your investment thesis, key points, and preliminary verdict.`;

        const result = await strategyAgent.generate(context);
        strategyAnalysis = result.text;
      }
    } catch (error) {
      const errorMsg = `Strategy agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // Phase 3: Run critiques (if research exists)
  let critiques: DealCritiques | undefined;
  if (researchReport && (includeSkeptic || includeRiskOfficer)) {
    try {
      const critiqueResult = await runCouncilCritique({
        companyName: opportunity.companyName,
        ticker: opportunity.ticker,
        thesis: opportunity.thesis,
        researchReport: researchReport,
      });

      critiques = critiqueResult.critiques;
    } catch (error) {
      const errorMsg = `Critiques failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  const duration = Date.now() - startTime;

  return {
    opportunity,
    researchReport,
    strategyAnalysis,
    critiques,
    duration,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Run research and critique for multiple opportunities in parallel
 */
export async function runResearchAndCritiqueBatch(
  opportunities: Opportunity[],
  options: {
    includeSkeptic?: boolean;
    includeRiskOfficer?: boolean;
    includeStrategyAgent?: boolean;
    concurrency?: number;
  } = {}
): Promise<ResearchCritiqueOutput[]> {
  const {
    includeSkeptic = true,
    includeRiskOfficer = true,
    includeStrategyAgent = true,
    concurrency = 3, // Process 3 at a time to be nice to APIs
  } = options;

  const results: ResearchCritiqueOutput[] = [];

  // Process in batches to limit concurrency
  for (let i = 0; i < opportunities.length; i += concurrency) {
    const batch = opportunities.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (opportunity) => {
        try {
          return await runResearchAndCritique({
            opportunity,
            includeSkeptic,
            includeRiskOfficer,
            includeStrategyAgent,
          });
        } catch (error) {
          return {
            opportunity,
            duration: 0,
            errors: [`Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          };
        }
      })
    );

    results.push(...batchResults);
  }

  return results;
}

/**
 * Get the appropriate strategy agent based on opportunity type
 */
function getStrategyAgentForType(type: string) {
  const typeLower = type.toLowerCase();

  if (typeLower.includes('value')) {
    return valueAgent;
  } else if (typeLower.includes('special') || typeLower.includes('sits')) {
    return specialSitsAgent;
  } else if (typeLower.includes('distressed')) {
    return distressedAgent;
  } else if (typeLower.includes('market-mover') || typeLower.includes('momentum')) {
    // Market movers don't have a dedicated strategy agent, use value as default
    return valueAgent;
  }

  // Default to value agent
  return valueAgent;
}
