/**
 * Gemini Deep Research Service
 *
 * Integrates with Google's Gemini Deep Research Agent via the Interactions API
 * Documentation: https://ai.google.dev/gemini-api/docs/deep-research
 */

interface ResearchOptions {
  thesis: string;
  dealId?: string;
}

interface ResearchStep {
  type: 'thinking' | 'searching' | 'reading' | 'analyzing' | 'progress';
  content: string;
  timestamp: string;
}

export class GeminiResearchService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_GEMINI_API_KEY || '';
  }

  private getApiKey(): string {
    if (!this.apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required');
    }
    return this.apiKey;
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
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: this.getApiKey() });

    yield {
      type: 'thinking',
      content: 'Starting deep research with Gemini...',
      timestamp: new Date().toISOString(),
    };

    // Create the interaction for deep research
    const interaction = await client.interactions.create({
      input: prompt,
      agent: 'deep-research-pro-preview-12-2025',
      background: true,
    });

    yield {
      type: 'thinking',
      content: `Deep research initiated (ID: ${interaction.id}). Waiting for completion...`,
      timestamp: new Date().toISOString(),
    };

    // Poll for completion
    let lastStatus = '';
    const POLL_INTERVAL = 10000; // 10 seconds

    while (true) {
      const result = await client.interactions.get(interaction.id);

      // Emit status updates
      if (result.status !== lastStatus) {
        lastStatus = result.status;
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
        const finalOutput = result.outputs[result.outputs.length - 1];
        const report = finalOutput?.text || 'No report generated';

        yield { type: 'complete', report };
        break;
      } else if (result.status === 'failed') {
        throw new Error(result.error || 'Deep research failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }

  private async *runStandardResearch(prompt: string): AsyncGenerator<ResearchStep | { type: 'complete'; report: string }> {
    yield {
      type: 'thinking',
      content: 'Initializing research analysis with Gemini 2.0...',
      timestamp: new Date().toISOString(),
    };

    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ apiKey: this.getApiKey() });

    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash-thinking-exp-01-21',
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const report = response.text() || 'No report generated';

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
