/**
 * Specialized Research Service
 *
 * Orchestrates research using the Mastra strategy agents.
 * Combines Gemini deep research with specialized strategy analysis.
 */

import { geminiResearch } from './gemini-research';
import { valueAgent, specialSitsAgent, distressedAgent } from '@/src/mastra';
import { skepticAgent } from '@/src/mastra/agents/skeptic-agent';
import { riskOfficerAgent } from '@/src/mastra/agents/risk-officer-agent';
import { verdictAgent } from '@/src/mastra/agents/verdict-agent';
import type { ResearchStrategy } from '@/src/types/research';

export interface SpecializedResearchInput {
  sessionId: string;
  thesis: string;
  strategy: ResearchStrategy;
  companyName?: string;
  ticker?: string;
}

export interface ResearchPhase {
  phase: 'starting' | 'researching' | 'strategy_analysis' | 'critique' | 'verdict' | 'complete' | 'error';
  agent?: string;
  content?: string;
  timestamp: string;
}

export interface SpecializedResearchOutput {
  researchReport: string;
  strategyAnalysis?: string;
  skepticCritique?: string;
  riskAssessment?: string;
  verdict?: string;
  strategy: ResearchStrategy;
  agentUsed: string;
}

/**
 * Get the strategy agent based on strategy type
 */
function getAgentForStrategy(strategy: ResearchStrategy) {
  switch (strategy) {
    case 'value':
      return valueAgent;
    case 'special-sits':
      return specialSitsAgent;
    case 'distressed':
      return distressedAgent;
    default:
      return null;
  }
}

/**
 * Build the strategy-specific prompt for the agent
 */
function buildStrategyPrompt(
  thesis: string,
  researchReport: string,
  strategy: ResearchStrategy,
  companyName?: string,
  ticker?: string
): string {
  const baseContext = `
# Investment Analysis Request

${companyName ? `## Company: ${companyName}${ticker ? ` (${ticker})` : ''}` : ''}

## Original Investment Thesis
${thesis}

## Gemini Deep Research Report
${researchReport}

---

## Your Task
Based on the research above, provide your specialized analysis from your unique investment perspective.
Focus on:
1. How this opportunity aligns (or doesn't) with your investment philosophy
2. Key factors you find most compelling or concerning
3. Your specific valuation approach and target price
4. Recommended position sizing and risk management
5. Key catalysts and timeline expectations
`;

  return baseContext;
}

/**
 * Run specialized research with strategy agent
 */
export async function* runSpecializedResearch(
  input: SpecializedResearchInput
): AsyncGenerator<ResearchPhase> {
  const { sessionId, thesis, strategy, companyName, ticker } = input;

  // Phase 1: Start notification
  yield {
    phase: 'starting',
    content: `Initializing ${strategy} research strategy...`,
    timestamp: new Date().toISOString(),
  };

  // Phase 2: Run Gemini deep research
  let researchReport = '';
  try {
    yield {
      phase: 'researching',
      agent: 'gemini-deep-research',
      content: 'Running deep research with Gemini...',
      timestamp: new Date().toISOString(),
    };

    for await (const step of geminiResearch.startResearch({
      thesis,
      companyName,
      ticker,
      dealId: sessionId,
    })) {
      if (step.type === 'complete') {
        researchReport = step.report;
        break;
      } else if (step.type === 'error') {
        yield {
          phase: 'error',
          agent: 'gemini-deep-research',
          content: step.content,
          timestamp: new Date().toISOString(),
        };
        return;
      }
    }
  } catch (error) {
    yield {
      phase: 'error',
      agent: 'gemini-deep-research',
      content: error instanceof Error ? error.message : 'Research failed',
      timestamp: new Date().toISOString(),
    };
    return;
  }

  // Phase 3: Run strategy agent analysis (if not general)
  let strategyAnalysis = '';
  const strategyAgent = getAgentForStrategy(strategy);

  if (strategyAgent && researchReport) {
    try {
      yield {
        phase: 'strategy_analysis',
        agent: strategy,
        content: `Running ${strategy} strategy analysis...`,
        timestamp: new Date().toISOString(),
      };

      const prompt = buildStrategyPrompt(thesis, researchReport, strategy, companyName, ticker);
      const result = await strategyAgent.generate(prompt);
      strategyAnalysis = result.text || '';
    } catch (error) {
      console.error(`Strategy agent error:`, error);
      strategyAnalysis = `Strategy analysis unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // Phase 4: Run critiques in parallel
  let skepticCritique = '';
  let riskAssessment = '';

  try {
    yield {
      phase: 'critique',
      agent: 'skeptic',
      content: 'Running council critique...',
      timestamp: new Date().toISOString(),
    };

    const fullContext = `
# Investment Analysis for Review

## Original Thesis
${thesis}

## Research Report
${researchReport}

${strategyAnalysis ? `## ${strategy.charAt(0).toUpperCase() + strategy.slice(1)} Strategy Analysis\n${strategyAnalysis}` : ''}

---

Please provide your critique.
`;

    const [skepticResult, riskResult] = await Promise.all([
      skepticAgent.generate(fullContext).catch(e => ({
        text: `Skeptic unavailable: ${e.message}`,
      })),
      riskOfficerAgent.generate(fullContext).catch(e => ({
        text: `Risk assessment unavailable: ${e.message}`,
      })),
    ]);

    skepticCritique = skepticResult.text || '';
    riskAssessment = riskResult.text || '';
  } catch (error) {
    console.error('Critique error:', error);
  }

  // Phase 5: Generate final verdict
  let verdict = '';
  try {
    yield {
      phase: 'verdict',
      agent: 'verdict',
      content: 'Generating investment verdict...',
      timestamp: new Date().toISOString(),
    };

    const verdictContext = `
# Complete Investment Analysis Package

## Original Thesis
${thesis}

## Gemini Research Report
${researchReport}

${strategyAnalysis ? `## Strategy Agent Analysis (${strategy})
${strategyAnalysis}` : ''}

## The Skeptic's Critique
${skepticCritique || 'Not available'}

## Risk Officer's Assessment
${riskAssessment || 'Not available'}

---

Synthesize all of the above and provide your final investment verdict.
`;

    const verdictResult = await verdictAgent.generate(verdictContext);
    verdict = verdictResult.text || '';
  } catch (error) {
    console.error('Verdict error:', error);
    verdict = `Verdict generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Phase 6: Complete
  yield {
    phase: 'complete',
    content: JSON.stringify({
      researchReport,
      strategyAnalysis,
      skepticCritique,
      riskAssessment,
      verdict,
      strategy,
      agentUsed: strategyAgent ? strategy : 'general',
    } as SpecializedResearchOutput),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run just the strategy agent analysis on existing research
 */
export async function runStrategyAnalysis(
  researchReport: string,
  thesis: string,
  strategy: ResearchStrategy,
  companyName?: string,
  ticker?: string
): Promise<string> {
  const strategyAgent = getAgentForStrategy(strategy);

  if (!strategyAgent) {
    return 'No strategy agent available for general research.';
  }

  const prompt = buildStrategyPrompt(thesis, researchReport, strategy, companyName, ticker);
  const result = await strategyAgent.generate(prompt);
  return result.text || 'No analysis generated';
}

export const specializedResearch = {
  runSpecializedResearch,
  runStrategyAnalysis,
};
