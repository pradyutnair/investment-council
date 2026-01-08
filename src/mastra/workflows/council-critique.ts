/**
 * Council Critique Workflow
 * 
 * Orchestrates the "Investment Council" where multiple AI agents
 * (The Skeptic and The Risk Officer) provide independent critiques
 * of a research report.
 */

import { skepticAgent } from '../agents/skeptic-agent';
import { riskOfficerAgent } from '../agents/risk-officer-agent';
import type { DealCritiques } from '@/types/deals';

interface CouncilInput {
  companyName: string;
  ticker?: string;
  thesis: string;
  researchReport: string;
}

interface CouncilOutput {
  critiques: DealCritiques;
  duration: number;
}

export async function runCouncilCritique(input: CouncilInput): Promise<CouncilOutput> {
  const startTime = Date.now();

  // Prepare context for agents
  const context = `# Investment Research Report for ${input.companyName}${input.ticker ? ` (${input.ticker})` : ''}

## Original Thesis
${input.thesis}

## Research Report
${input.researchReport}

---

Please provide your critique of this investment research report.`;

  try {
    // Run both critiques in parallel for speed
    const [skepticResult, riskOfficerResult] = await Promise.all([
      // The Skeptic (ChatGPT)
      skepticAgent.generate(context).catch(error => {
        console.error('Skeptic agent error:', error);
        return {
          text: `# Error Generating Critique\n\nThe Skeptic agent encountered an error: ${error.message}\n\nPlease try again or check your OpenAI API configuration.`,
        };
      }),
      
      // The Risk Officer (Claude)
      riskOfficerAgent.generate(context).catch(error => {
        console.error('Risk Officer agent error:', error);
        return {
          text: `# Error Generating Assessment\n\nThe Risk Officer agent encountered an error: ${error.message}\n\nPlease try again or check your Anthropic API configuration.`,
        };
      }),
    ]);

    const critiques: DealCritiques = {
      skeptic: {
        content: skepticResult.text || 'No critique generated',
        timestamp: new Date().toISOString(),
      },
      risk_officer: {
        content: riskOfficerResult.text || 'No assessment generated',
        timestamp: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return { critiques, duration };
  } catch (error) {
    console.error('Council workflow error:', error);
    throw new Error(`Council critique failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sequential version (if you want Risk Officer to see Skeptic's critique)
 */
export async function runCouncilCritiqueSequential(input: CouncilInput): Promise<CouncilOutput> {
  const startTime = Date.now();

  const baseContext = `# Investment Research Report for ${input.companyName}${input.ticker ? ` (${input.ticker})` : ''}

## Original Thesis
${input.thesis}

## Research Report
${input.researchReport}`;

  try {
    // Step 1: The Skeptic provides initial critique
    const skepticResult = await skepticAgent.generate(
      `${baseContext}\n\n---\n\nProvide your skeptical critique of this investment research report.`
    );

    const skepticCritique = skepticResult.text || 'No critique generated';

    // Step 2: The Risk Officer sees both report AND Skeptic's critique
    const riskOfficerResult = await riskOfficerAgent.generate(
      `${baseContext}\n\n## The Skeptic's Critique\n${skepticCritique}\n\n---\n\nNow provide your risk assessment, taking into account both the original report and The Skeptic's concerns.`
    );

    const critiques: DealCritiques = {
      skeptic: {
        content: skepticCritique,
        timestamp: new Date().toISOString(),
      },
      risk_officer: {
        content: riskOfficerResult.text || 'No assessment generated',
        timestamp: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return { critiques, duration };
  } catch (error) {
    console.error('Sequential council workflow error:', error);
    throw new Error(`Council critique failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
