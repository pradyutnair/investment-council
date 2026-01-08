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
    return `You are a top hedge fund analyst, I am your PM. I want you to conduct deep research on the following investment thesis/query.

INVESTMENT THESIS/QUERY TO INVESTIGATE:
${thesis}

INVESTMENT MANDATE & PREFERENCES:
You should approach this with the following investment philosophy in mind:
- Pitch me a special situation (spinoffs, demergers, restructuring, Joel Greenblatt style) or value investment opportunity that has asymmetric risk reward
- I prefer to invest where most people aren't looking so there's lesser competition - something like sub $1bn market cap, low/no analyst coverage, US market
- However if the opportunity is very compelling I don't mind going out of these factors
- I don't mind the volatility, but I want a very good payoff - even better if there's a clear catalyst
- If it's a value situation - I want it to be deep value and make sure it isn't a value trap
- I want to allocate a good chunk - roughly 10-15% position size

RESEARCH MANDATE:
Conduct comprehensive due diligence covering:

1. THESIS VALIDATION
   - Analyze the core premise of the investment thesis
   - Identify key assumptions and their validity
   - Assess the logical consistency of the thesis
   - Is this genuinely asymmetric risk/reward?

2. SPECIAL SITUATION ANALYSIS (if applicable)
   - Type of situation (spinoff, demerger, restructuring, activism, etc.)
   - Timeline and key milestones
   - Why is this mispriced? What's the market missing?
   - Forced selling or structural reasons for mispricing

3. BUSINESS ANALYSIS
   - Business models and competitive positioning
   - Revenue streams and unit economics
   - Management quality and track record (especially capital allocation)
   - Moat analysis (competitive advantages)
   - Insider ownership and alignment

4. FINANCIAL ANALYSIS
   - Historical financial performance (5+ years)
   - Profitability metrics (margins, ROIC, FCF)
   - Balance sheet health (debt, liquidity, hidden assets)
   - Valuation analysis (P/E, EV/EBITDA, DCF, liquidation value)
   - Is this genuinely cheap or a value trap?

5. INDUSTRY & MARKET CONTEXT
   - Industry dynamics and growth outlook
   - Competitive landscape
   - Analyst coverage (how many analysts? institutional ownership?)
   - Market cap and liquidity considerations

6. CATALYSTS & TIMELINE
   - Specific catalysts that will unlock value
   - Expected timeline for each catalyst
   - What needs to happen for the thesis to play out?

7. RISKS & VALUE TRAP ANALYSIS
   - Key investment risks
   - Why might this be a value trap?
   - What could go wrong?
   - Downside scenario analysis
   - Position sizing considerations for 10-15% allocation

OUTPUT FORMAT:
Provide a comprehensive markdown report structured as a professional investment memo with:
- Executive Summary (with clear buy/pass recommendation)
- Investment thesis in 2-3 sentences
- Detailed sections for each area above
- Financial tables where relevant (using proper markdown table format with | separators)
- Clear investment conclusion with confidence level
- Specific entry price targets and position sizing
- Key questions that remain unanswered

CRITICAL FORMATTING REQUIREMENTS:
1. **Inline Source Citations**: After EACH factual sentence/statement, include the source as a small hyperlinked citation capsule in the format: [1], [2], etc.
2. **Reference List**: At the end of the report, include a numbered reference list with full URLs in this exact format:

   ## Sources
   1. [Source Name](URL)
   2. [Source Name](URL)

3. **Table Format**: Use proper markdown table syntax with | separators and alignment. Example:
   | Metric | 2022 | 2023 | 2024 |
   |--------|------|------|------|
   | Revenue | $100M | $120M | $140M |
   | Margin | 15% | 18% | 22% |

4. **Citation Placement**: Citations should appear immediately after the sentence they support, before any punctuation. Example: "The company grew revenue 20% year-over-year[1]."
5. **Multiple Sources**: Use multiple citations like [1][2] when a statement is supported by multiple sources

Be thorough, objective, and data-driven. Every factual claim must have a source citation.
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
