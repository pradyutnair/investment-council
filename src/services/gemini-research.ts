/**
 * Gemini Deep Research Service
 * 
 * Uses Google's Gemini to do investment research
 */

import { GoogleGenAI } from '@google/genai';

interface ResearchOptions {
  thesis: string;
  strategy?: 'value' | 'special-sits' | 'distressed' | 'general';
}

interface ResearchStep {
  type: 'thinking' | 'searching' | 'reading' | 'analyzing' | 'progress' | 'error';
  content: string;
  timestamp: string;
}

// Strategy-specific research prompts
const STRATEGY_PROMPTS: Record<string, string> = {
  value: `You are a value investing analyst following Benjamin Graham and Warren Buffett principles.

RESEARCH FOCUS:
- Look for stocks trading below intrinsic value
- Find companies with strong balance sheets and low debt
- Identify businesses with durable competitive advantages (moats)
- Calculate margin of safety
- Focus on P/E, P/B, debt ratios, ROE

INVESTMENT CRITERIA:
- P/E ratio below market average or industry peers
- P/B ratio ideally below 1.5
- Strong free cash flow generation
- Low debt-to-equity ratio
- Consistent dividend history (bonus)
- Management with skin in the game`,

  'special-sits': `You are a special situations analyst following Joel Greenblatt's approach.

RESEARCH FOCUS:
- Spinoffs where parent company is divesting a division
- Merger arbitrage opportunities with clear spreads
- Restructuring situations and turnarounds
- Rights offerings and recapitalizations
- Activism targets with identified catalysts

INVESTMENT CRITERIA:
- Clear catalyst with defined timeline
- Mispricing due to forced selling or market inefficiency
- Hidden value not reflected in current price
- Management incentives aligned with shareholders
- Identifiable downside protection`,

  distressed: `You are a distressed investing analyst following Howard Marks and Oaktree principles.

RESEARCH FOCUS:
- Companies or sectors experiencing significant distress
- Beaten-down stocks at multi-year lows
- Bankruptcy or restructuring candidates
- Turnaround situations with new management
- Cycle bottom opportunities

INVESTMENT CRITERIA:
- Stock down 50%+ from highs
- Identifiable reason for distress (temporary vs permanent)
- Strong underlying assets or business
- Path to recovery with clear catalysts
- Asymmetric risk/reward (limited downside, significant upside)`,

  general: `You are a hedge fund analyst looking for asymmetric investment opportunities.

RESEARCH FOCUS:
- Any compelling investment opportunity
- Focus on risk/reward asymmetry
- Look for market inefficiencies
- Consider both fundamental and technical factors

INVESTMENT CRITERIA:
- Clear investment thesis
- Identifiable catalysts
- Reasonable valuation
- Manageable risks`
};

export class GeminiResearchService {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GEMINI_API_KEY not found');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  async *startResearch(options: ResearchOptions): AsyncGenerator<ResearchStep | { type: 'complete'; report: string }> {
    const { thesis, strategy = 'general' } = options;
    const strategyPrompt = STRATEGY_PROMPTS[strategy] || STRATEGY_PROMPTS.general;

    const prompt = `${strategyPrompt}

---

USER'S INVESTMENT THESIS/QUERY:
${thesis}

---

RESEARCH MANDATE:
Based on the above investment philosophy and the user's thesis, find and analyze ONE specific stock recommendation that fits the criteria.

Your research should include:

1. **STOCK RECOMMENDATION**
   - Ticker symbol and company name
   - Current price and market cap
   - Why this stock fits the strategy

2. **COMPANY OVERVIEW**
   - What the company does
   - Industry and competitive position
   - Recent developments

3. **FINANCIAL ANALYSIS**
   - Key metrics (P/E, P/B, EV/EBITDA, etc.)
   - Revenue and earnings trends
   - Balance sheet health
   - Free cash flow analysis

4. **INVESTMENT THESIS**
   - Why this is a compelling opportunity
   - Key catalysts that will unlock value
   - Expected timeline

5. **VALUATION**
   - Current valuation vs fair value estimate
   - Upside potential
   - Target price

6. **RISKS**
   - Key risks to the thesis
   - What could go wrong
   - Mitigating factors

7. **RECOMMENDATION**
   - Buy/Hold/Sell recommendation
   - Suggested position size
   - Entry strategy

FORMAT REQUIREMENTS:
- Use clear markdown headers
- Include specific numbers and data
- Be actionable and specific
- Include sources where possible using [Source Name](URL) format
- Use <mark> tags to highlight the most important insights

Provide a comprehensive but focused analysis. Quality over quantity.`;

    yield {
      type: 'thinking',
      content: 'Starting research...',
      timestamp: new Date().toISOString(),
    };

    // Try deep research first, fall back to standard
    try {
      yield* this.runDeepResearch(prompt);
    } catch (error) {
      console.warn('Deep Research unavailable, using standard Gemini:', error);
      yield* this.runStandardResearch(prompt);
    }
  }

  private async *runDeepResearch(prompt: string): AsyncGenerator<ResearchStep | { type: 'complete'; report: string }> {
    const client = this.getClient();

    yield {
      type: 'progress',
      content: 'Initiating Gemini deep research agent...',
      timestamp: new Date().toISOString(),
    };

    const interaction = await client.interactions.create({
      input: prompt,
      agent: 'deep-research-pro-preview-12-2025',
      background: true,
    });

    const interactionId = interaction.id;

    yield {
      type: 'progress',
      content: 'Deep research started. Analyzing investment opportunities...',
      timestamp: new Date().toISOString(),
    };

    // Poll for completion
    const POLL_INTERVAL = 10000;
    const MAX_POLL_TIME = 600000; // 10 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_TIME) {
      const result = await client.interactions.get(interactionId!);

      if (result.status === 'completed') {
        yield {
          type: 'progress',
          content: 'Research complete. Processing results...',
          timestamp: new Date().toISOString(),
        };

        const outputs = result.outputs ?? [];
        const finalOutput = outputs[outputs.length - 1];
        const report = (finalOutput as any)?.text || 'No report generated';

        yield { type: 'complete', report };
        return;
      } else if (result.status === 'failed') {
        throw new Error((result as any).error || 'Deep research failed');
      }

      // Status update
      yield {
        type: 'progress',
        content: `Research in progress... (${Math.floor((Date.now() - startTime) / 1000)}s)`,
        timestamp: new Date().toISOString(),
      };

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error('Research timed out');
  }

  private async *runStandardResearch(prompt: string): AsyncGenerator<ResearchStep | { type: 'complete'; report: string }> {
    yield {
      type: 'progress',
      content: 'Running analysis with Gemini...',
      timestamp: new Date().toISOString(),
    };

    const client = this.getClient();

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const report = response.text || 'No report generated';

    yield { type: 'complete', report };
  }
}

export const geminiResearch = new GeminiResearchService();
