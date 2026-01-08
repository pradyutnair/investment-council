/**
 * Gemini Deep Research Service
 *
 * Integrates with Google's Gemini Deep Research Agent via the Interactions API
 * Documentation: https://ai.google.dev/gemini-api/docs/deep-research
 */

import { GoogleGenAI } from '@google/genai';
import type { ContextFile } from '@/src/types/deals';

interface ResearchOptions {
  thesis: string;
  dealId?: string;
  companyName?: string;
  ticker?: string;
  contextFiles?: ContextFile[];
}

interface ResearchStep {
  type: 'thinking' | 'searching' | 'reading' | 'analyzing' | 'progress' | 'error';
  content: string;
  timestamp: string;
}

export class GeminiResearchService {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GEMINI_API_KEY not found in environment');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Start deep research on an investment thesis
   * Uses the official Gemini Interactions API
   */
  async *startResearch(options: ResearchOptions): AsyncGenerator<ResearchStep | { type: 'complete'; report: string }> {
    const { thesis } = options;

    const prompt = this.buildResearchPrompt(thesis);

    try {
      yield* this.runDeepResearch(prompt);
    } catch (error) {
      console.warn('Deep Research API unavailable, falling back to standard Gemini:', error);
      yield* this.runStandardResearch(prompt);
    }
  }

  private buildResearchPrompt(thesis: string): string {
    return `You are an expert investment analyst conducting deep research on the following investment thesis.

INVESTMENT THESIS TO INVESTIGATE:
${thesis}

RESEARCH MANDATE:
Conduct comprehensive due diligence covering:

1. THESIS VALIDATION
   - Analyze the core premise of the investment thesis
   - Identify key assumptions and their validity
   - Assess the logical consistency of the thesis

2. BUSINESS ANALYSIS (if applicable companies are identified)
   - Business models and competitive positioning
   - Revenue streams and unit economics
   - Management quality and track record
   - Moat analysis (competitive advantages)

3. FINANCIAL ANALYSIS (if applicable companies are identified)
   - Historical financial performance (5+ years)
   - Profitability metrics (margins, ROIC, FCF)
   - Balance sheet health (debt, liquidity)
   - Valuation analysis (P/E, EV/EBITDA, DCF)

4. INDUSTRY & MARKET CONTEXT
   - Industry dynamics and growth outlook
   - Competitive landscape
   - Regulatory environment
   - Market share trends

5. RISKS & CATALYSTS
   - Key investment risks
   - Potential catalysts (positive and negative)
   - Scenario analysis
   - Black swan events to consider

OUTPUT FORMAT:
Provide a comprehensive markdown report structured as a professional investment memo with:
- Executive Summary (with thesis validation)
- Detailed sections for each area above
- Financial tables where relevant
- Clear investment conclusion with confidence level
- Key questions that remain unanswered

Be thorough, objective, and data-driven. Cite specific metrics and sources where possible.
Think critically about the thesis and don't just confirm bias - actively seek disconfirming evidence.`;
  }

  private async *runDeepResearch(prompt: string): AsyncGenerator<ResearchStep | { type: 'complete'; report: string }> {
    yield {
      type: 'thinking',
      content: 'Starting deep research with Gemini...',
      timestamp: new Date().toISOString(),
    };

    const client = this.getClient();

    // Use the official SDK for Deep Research
    const interaction = await client.interactions.create({
      input: prompt,
      agent: 'deep-research-pro-preview-12-2025',
      background: true,
    });

    const interactionId = interaction.id;

    yield {
      type: 'thinking',
      content: `Deep research initiated (ID: ${interactionId}). Waiting for completion...`,
      timestamp: new Date().toISOString(),
    };

    // Poll for completion
    let lastStatus = '';
    const POLL_INTERVAL = 10000; // 10 seconds
    const MAX_POLL_TIME = 600000; // 10 minutes max
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_TIME) {
      const result = await client.interactions.get(interactionId!);

      // Emit status updates
      if (result.status !== lastStatus) {
        lastStatus = result.status || '';
        yield {
          type: 'progress',
          content: `Research status: ${result.status}`,
          timestamp: new Date().toISOString(),
        };
      }

      if (result.status === 'completed') {
        yield {
          type: 'analyzing',
          content: 'Research completed. Processing final report...',
          timestamp: new Date().toISOString(),
        };

        // Get the final output
        const outputs = result.outputs ?? [];
        const finalOutput = outputs[outputs.length - 1];
        const report = (finalOutput as any)?.text || 'No report generated';

        yield { type: 'complete', report };
        return;
      } else if (result.status === 'failed') {
        throw new Error((result as any).error || 'Deep research failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }

    // Timeout - fall back to standard research
    throw new Error('Deep research timed out after 10 minutes');
  }

  private async *runStandardResearch(prompt: string): AsyncGenerator<ResearchStep | { type: 'complete'; report: string }> {
    yield {
      type: 'thinking',
      content: 'Initializing research analysis with Gemini Flash...',
      timestamp: new Date().toISOString(),
    };

    const client = this.getClient();

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const report = response.text || 'No report generated';

    yield {
      type: 'analyzing',
      content: 'Analysis complete. Generating comprehensive report...',
      timestamp: new Date().toISOString(),
    };

    yield { type: 'complete', report };
  }
}

// Export singleton instance
export const geminiResearch = new GeminiResearchService();
