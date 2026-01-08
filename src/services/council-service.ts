/**
 * Council Service
 *
 * Coordinates analysis from multiple AI models (ChatGPT, Claude) to critique
 * and debate the Gemini Deep Research report.
 *
 * Note: If an API key is missing, that agent will be skipped.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

interface CouncilAnalysisOptions {
  researchReport: string;
  thesis: string;
}

interface AgentAnalysis {
  agent: string;
  role: string;
  analysis: string;
  timestamp: string;
}

interface DebateRound {
  round: number;
  messages: Array<{
    agent: string;
    content: string;
  }>;
}

export class CouncilService {
  private anthropic: Anthropic | null;
  private openai: OpenAI | null;
  private hasAnthropic: boolean;
  private hasOpenAI: boolean;

  constructor() {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    this.hasAnthropic = !!anthropicKey;
    this.hasOpenAI = !!openaiKey;

    if (!this.hasAnthropic) {
      console.warn('ANTHROPIC_API_KEY not found - Claude analysis will be skipped');
    }
    if (!this.hasOpenAI) {
      console.warn('OPENAI_API_KEY not found - ChatGPT analysis will be skipped');
    }

    this.anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
    this.openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
  }

  /**
   * Run the full council analysis and debate
   */
  async runCouncilAnalysis(options: CouncilAnalysisOptions): Promise<{
    analyses: AgentAnalysis[];
    debate: DebateRound[];
  }> {
    const { researchReport, thesis } = options;

    // Phase 1: Individual analyses (only for available agents)
    const analysisPromises: Promise<AgentAnalysis>[] = [];

    if (this.hasOpenAI) {
      analysisPromises.push(this.getSkepticAnalysis(thesis, researchReport));
      analysisPromises.push(this.getBullCaseAnalysis(thesis, researchReport));
    }

    if (this.hasAnthropic) {
      analysisPromises.push(this.getRiskAssessment(thesis, researchReport));
    }

    const analyses = await Promise.all(analysisPromises);

    // Phase 2: Facilitate debate (only if we have multiple analyses)
    const debate = await this.facilitateDebate(thesis, researchReport, analyses);

    return { analyses, debate };
  }

  /**
   * ChatGPT as the Skeptic - challenges the research
   */
  private async getSkepticAnalysis(thesis: string, researchReport: string): Promise<AgentAnalysis> {
    if (!this.openai) throw new Error('OpenAI not available');

    const prompt = `You are the Investment Council's SKEPTIC. Your role is to critically challenge investment research and identify weaknesses, biases, and missing information.

ORIGINAL THESIS:
${thesis}

GEMINI RESEARCH REPORT:
${researchReport}

Provide a comprehensive skeptical critique covering:

1. THESIS CHALLENGES
   - What assumptions might be flawed?
   - What could go wrong that's not addressed?
   - Counter-arguments to the main thesis

2. RESEARCH CRITIQUE
   - What's missing from the research?
   - What biases might be present?
   - What sources are missing or questionable?
   - What data points need verification?

3. RISK ASSESSMENT
   - Underappreciated risks
   - Black swan scenarios
   - Structural/industry risks
   - Execution risks

4. VALUATION CONCERNS
   - Is the valuation justified?
   - What multiple compression scenarios exist?
   - What's the bear case valuation?

5. KEY QUESTIONS
   - What questions remain unanswered?
   - What additional research is needed?

Be rigorous, critical, and don't hold back. Your job is to stress-test this investment idea.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
    });

    return {
      agent: 'chatgpt',
      role: 'Skeptic',
      analysis: response.choices[0]?.message?.content || 'No analysis generated',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Claude as Risk Officer - assesses risks comprehensively
   */
  private async getRiskAssessment(thesis: string, researchReport: string): Promise<AgentAnalysis> {
    if (!this.anthropic) throw new Error('Anthropic not available');

    const prompt = `You are the Investment Council's RISK OFFICER. Your role is to provide comprehensive risk assessment and identify potential downside scenarios.

ORIGINAL THESIS:
${thesis}

GEMINI RESEARCH REPORT:
${researchReport}

Provide a detailed risk assessment covering:

1. MARKET RISKS
   - Systematic market risks
   - Sector-specific risks
   - Competitive dynamics
   - Technological disruption risks

2. FINANCIAL RISKS
   - Liquidity risks
   - Leverage concerns
   - Cash flow vulnerabilities
   - Counterparty risks

3. OPERATIONAL RISKS
   - Management/team risks
   - Execution risks
   - Regulatory/legal risks
   - Supply chain/operational dependencies

4. DOWNSIDE SCENARIOS
   - Base case bear scenario (30% downside)
   - Stress case bear scenario (50%+ downside)
   - What would trigger these scenarios?

5. RISK MITIGATION
   - What could mitigate these risks?
   - What would you need to see to be more comfortable?
   - What position size is appropriate given the risks?

6. RED FLAGS
   - Deal-breaker concerns
   - Things that would make you pass immediately

Be thorough and specific. Risk management is your primary concern.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      agent: 'claude',
      role: 'Risk Officer',
      analysis: response.content[0]?.type === 'text' ? response.content[0].text : 'No analysis generated',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gemini/ChatGPT as Bull Case Advocate - argues for the investment
   */
  private async getBullCaseAnalysis(thesis: string, researchReport: string): Promise<AgentAnalysis> {
    if (!this.openai) throw new Error('OpenAI not available');

    const prompt = `You are the Investment Council's BULL CASE ADVOCATE. Your role is to articulate the strongest possible case for this investment, while being intellectually honest.

ORIGINAL THESIS:
${thesis}

GEMINI RESEARCH REPORT:
${researchReport}

Provide a compelling bull case analysis covering:

1. INVESTMENT THESIS STRENGTHS
   - What makes this thesis compelling?
   - What's the core insight that others might be missing?
   - Why does this opportunity exist?

2. UPSIDE DRIVERS
   - Catalysts that could drive the investment higher
   - Scenario analysis (base, bull, super-bull)
   - Timeline for thesis playing out

3. COMPETITIVE ADVANTAGES
   - What moats exist?
   - What makes this defensible?
   - Why can't competition easily replicate?

4. VALUATION UPSIDE
   - What's the bull case valuation?
   - What multiple expansion is possible?
   - What's the expected return under various scenarios?

5. KEY MONITORING POINTS
   - What metrics indicate the thesis is working?
   - What early signs of success should you look for?

6. CONVICTION LEVEL
   - How confident are you in this bull case?
   - What would increase your confidence?

Be compelling but realistic. Don't overpromise - a credible bull case is more convincing than hype.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
    });

    return {
      agent: 'gemini',
      role: 'Bull Case Advocate',
      analysis: response.choices[0]?.message?.content || 'No analysis generated',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Facilitate a debate between the agents
   */
  private async facilitateDebate(
    thesis: string,
    researchReport: string,
    analyses: AgentAnalysis[]
  ): Promise<DebateRound[]> {
    const debate: DebateRound[] = [];

    // Extract the individual analyses
    const skepticAnalysis = analyses.find(a => a.role === 'Skeptic')?.analysis || '';
    const riskAnalysis = analyses.find(a => a.role === 'Risk Officer')?.analysis || '';
    const bullAnalysis = analyses.find(a => a.role === 'Bull Case Advocate')?.analysis || '';

    // Only run debate if we have at least 2 analyses
    if (analyses.length < 2) {
      return debate;
    }

    // Round 1: Skeptic responds to Bull Case (if both exist)
    if (bullAnalysis && skepticAnalysis && this.hasOpenAI) {
      const round1 = await this.debateRound(
        thesis,
        researchReport,
        'Skeptic',
        `BULL CASE ARGUMENT:
${bullAnalysis.substring(0, 2000)}...

Respond to the bull case. Point out flaws, counter-arguments, and where the bull case may be too optimistic. Be specific.`,
        'chatgpt'
      );

      debate.push({
        round: 1,
        messages: [
          { agent: 'bull-advocate', content: 'Bull case presented (see analysis above)' },
          { agent: 'skeptic', content: round1 },
        ],
      });
    }

    // Round 2: Risk Officer responds to both sides (if available)
    if (riskAnalysis && this.hasAnthropic) {
      const round1Content = debate.find(r => r.round === 1)?.messages[1]?.content || '';

      const round2 = await this.debateRound(
        thesis,
        researchReport,
        'Risk Officer',
        `DEBATE SO FAR:

BULL CASE: ${bullAnalysis.substring(0, 1500)}...

SKEPTIC'S RESPONSE: ${round1Content.substring(0, 1500)}...

As the Risk Officer, weigh both sides. What risks does each side overlook? What's your synthesized view of the risk/reward? Provide your balanced assessment.`,
        'claude'
      );

      debate.push({
        round: 2,
        messages: [
          { agent: 'risk-officer', content: round2 },
        ],
      });
    }

    // Round 3: Final synthesis
    if (this.hasOpenAI) {
      const round2Content = debate.find(r => r.round === 2)?.messages[0]?.content || '';
      const round1Content = debate.find(r => r.round === 1)?.messages[1]?.content || '';

      const round3 = await this.debateRound(
        thesis,
        researchReport,
        'Council Synthesizer',
        `COUNCIL DEBATE SUMMARY:

BULL CASE: ${bullAnalysis.substring(0, 1000)}...

SKEPTIC'S CRITIQUE: ${skepticAnalysis.substring(0, 1000)}...

RISK OFFICER'S ASSESSMENT: ${riskAnalysis.substring(0, 1000)}...

DEBATE EXCHANGE:
${round1Content.substring(0, 1000)}...

${round2Content.substring(0, 1000)}...

Provide a final synthesis that:

1. Identifies areas of agreement and disagreement
2. Highlights the most compelling arguments from each side
3. Identifies what additional research would be valuable
4. Provides an overall council perspective on the investment
5. Suggests a stance (invest/pass/watch) with rationale

This synthesis will inform the final investment decision. Be balanced and thorough.`,
        'chatgpt'
      );

      debate.push({
        round: 3,
        messages: [
          { agent: 'synthesizer', content: round3 },
        ],
      });
    }

    return debate;
  }

  private async debateRound(
    thesis: string,
    researchReport: string,
    role: string,
    prompt: string,
    model: 'chatgpt' | 'claude'
  ): Promise<string> {
    const fullPrompt = `You are ${role} participating in an investment council debate.

ORIGINAL THESIS: ${thesis}

RESEARCH REPORT SUMMARY: ${researchReport.substring(0, 1000)}...

${prompt}`;

    if (model === 'chatgpt') {
      if (!this.openai) throw new Error('OpenAI not available');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 3000,
      });
      return response.choices[0]?.message?.content || 'No response';
    } else {
      if (!this.anthropic) throw new Error('Anthropic not available');
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: fullPrompt }],
      });
      return response.content[0]?.type === 'text' ? response.content[0].text : 'No response';
    }
  }
}

// Export singleton instance
export const councilService = new CouncilService();
