/**
 * Opportunity Discovery Workflow
 *
 * Orchestrates multiple screener agents to discover investment opportunities
 * across different strategies (value, special situations, distressed, market movers).
 */

import { valueScreenerAgent } from '../agents/value-screener-agent';
import { specialSitsScreenerAgent } from '../agents/special-sits-screener-agent';
import { distressedScreenerAgent } from '../agents/distressed-screener-agent';
import { marketMoversAgent } from '../agents/market-movers-agent';
import { fmpKeyMetrics, fmpPriceSnapshot } from '../tools';
import { Agent } from '@mastra/core/agent';

export interface DiscoveryType {
  type: 'value' | 'special-sits' | 'distressed' | 'market-movers';
  label: string;
  agent: Agent<any, any, any>;
}

export interface Opportunity {
  ticker: string;
  companyName: string;
  type: string;
  thesis: string;
  keyMetrics: Record<string, number>;
  catalyst?: string;
  riskLevel: 'low' | 'medium' | 'high';
  discoveredBy: string;
  score?: number;
}

export interface DiscoveryInput {
  discoveryTypes: ('value' | 'special-sits' | 'distressed' | 'market-movers')[];
  marketCap?: 'micro' | 'small' | 'mid' | 'large' | 'all';
  maxResults?: number;
  enrichWithMetrics?: boolean;
}

export interface DiscoveryOutput {
  opportunities: Opportunity[];
  totalDiscovered: number;
  byType: Record<string, number>;
  duration: number;
}

const DISCOVERY_AGENTS: Record<string, DiscoveryType> = {
  value: {
    type: 'value',
    label: 'Value Opportunities',
    agent: valueScreenerAgent,
  },
  'special-sits': {
    type: 'special-sits',
    label: 'Special Situations',
    agent: specialSitsScreenerAgent,
  },
  distressed: {
    type: 'distressed',
    label: 'Distressed Securities',
    agent: distressedScreenerAgent,
  },
  'market-movers': {
    type: 'market-movers',
    label: 'Market Movers',
    agent: marketMoversAgent,
  },
};

/**
 * Parse opportunities from agent response text
 */
function parseOpportunities(agentText: string, type: string): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Pattern to match opportunities in agent output
  // Looks for TICKER - Company Name patterns
  const tickerPattern = /\*\*Opportunity:\s*\[([A-Z]{1,5})\]\s*-\s*\[([^\]]+)\]\*\*/g;
  let match;

  while ((match = tickerPattern.exec(agentText)) !== null) {
    const ticker = match[1];
    const companyName = match[2];

    // Extract thesis and other details from surrounding text
    const start = match.index;
    const end = agentText.indexOf('---', start);
    const sectionText = end > 0 ? agentText.substring(start, end) : agentText.substring(start);

    // Extract thesis
    const thesisMatch = sectionText.match(/Thesis:\s*([^\n]+)/);
    const thesis = thesisMatch ? thesisMatch[1].trim() : 'Undetailed thesis from agent analysis';

    // Extract metrics if available
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
      else if (suffix === 'M') mc = mc; // Already in millions
      metrics.marketCap = mc;
    }

    // Extract verdict/confidence
    const verdictMatch = sectionText.match(/Verdict:\s*\[([^\]]+)\]\s*with\s*\[(\d+)%\]/);
    const confidence = verdictMatch ? parseInt(verdictMatch[2], 10) : 50;

    // Determine risk level based on type and confidence
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (type === 'distressed') riskLevel = 'high';
    else if (type === 'value' && confidence > 70) riskLevel = 'low';
    else if (confidence < 50) riskLevel = 'high';

    opportunities.push({
      ticker,
      companyName,
      type,
      thesis,
      keyMetrics: metrics,
      riskLevel,
      discoveredBy: type,
      score: confidence,
    });
  }

  return opportunities;
}

/**
 * Deduplicate opportunities across screener types
 */
function deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const seen = new Set<string>();
  const unique: Opportunity[] = [];

  for (const opp of opportunities) {
    const key = opp.ticker.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(opp);
    } else {
      // If already seen, merge types if different
      const existing = unique.find(o => o.ticker.toLowerCase() === key);
      if (existing && existing.type !== opp.type) {
        existing.type = `${existing.type} + ${opp.type}`;
        existing.score = Math.max(existing.score || 0, opp.score || 0);
      }
    }
  }

  return unique;
}

/**
 * Enrich opportunities with detailed metrics
 */
async function enrichOpportunities(opportunities: Opportunity[]): Promise<Opportunity[]> {
  const enriched = await Promise.all(
    opportunities.slice(0, 10).map(async (opp) => {
      try {
        const [price, metrics] = await Promise.all([
          fmpPriceSnapshot.execute({ context: { ticker: opp.ticker }, runtimeContext: {} as any }),
          fmpKeyMetrics.execute({ context: { ticker: opp.ticker, period: 'annual', limit: 1 }, runtimeContext: {} as any }),
        ]);

        const priceData = price.data;
        const metricsData = Array.isArray(metrics.data) ? metrics.data[0] : metrics.data;

        return {
          ...opp,
          keyMetrics: {
            ...opp.keyMetrics,
            price: priceData?.price,
            marketCap: priceData?.marketCap,
            pe: metricsData?.peRatioTTM || metricsData?.peRatio,
            pb: metricsData?.pbRatioTTM || metricsData?.pbRatio,
            debtToEquity: metricsData?.debtToEquity,
            roe: metricsData?.roeTTM || metricsData?.roe,
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

/**
 * Rank opportunities by quality score
 */
function rankOpportunities(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.sort((a, b) => {
    // Sort by score (confidence) first, then by risk level
    const scoreA = a.score || 50;
    const scoreB = b.score || 50;

    if (Math.abs(scoreA - scoreB) > 10) {
      return scoreB - scoreA; // Higher score first
    }

    // Then by risk level (low < medium < high)
    const riskOrder = { low: 0, medium: 1, high: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

/**
 * Main opportunity discovery workflow
 */
export async function runOpportunityDiscovery(input: DiscoveryInput): Promise<DiscoveryOutput> {
  const startTime = Date.now();
  const {
    discoveryTypes,
    maxResults = 20,
    enrichWithMetrics = true,
  } = input;

  let allOpportunities: Opportunity[] = [];
  const byType: Record<string, number> = {};

  // Step 1: Run selected screeners in parallel
  const screenerPromises = discoveryTypes.map(async (type) => {
    try {
      const agentConfig = DISCOVERY_AGENTS[type];
      if (!agentConfig) {
        console.warn(`Unknown discovery type: ${type}`);
        return [];
      }

      const prompt = `Find opportunities for ${agentConfig.label}. Screen for current opportunities and present your findings.`;
      const result = await agentConfig.agent.generate(prompt);

      const opportunities = parseOpportunities(result.text, type);
      byType[type] = opportunities.length;

      return opportunities;
    } catch (error) {
      console.error(`Error running ${type} screener:`, error);
      return [];
    }
  });

  const screenerResults = await Promise.all(screenerPromises);
  allOpportunities = screenerResults.flat();

  // Step 2: Deduplicate opportunities
  const uniqueOpportunities = deduplicateOpportunities(allOpportunities);

  // Step 3: Enrich with metrics if requested
  let enrichedOpportunities = uniqueOpportunities;
  if (enrichWithMetrics) {
    enrichedOpportunities = await enrichOpportunities(uniqueOpportunities);
  }

  // Step 4: Rank by quality
  const rankedOpportunities = rankOpportunities(enrichedOpportunities);

  // Step 5: Limit results
  const finalOpportunities = rankedOpportunities.slice(0, maxResults);

  const duration = Date.now() - startTime;

  return {
    opportunities: finalOpportunities,
    totalDiscovered: allOpportunities.length,
    byType,
    duration,
  };
}

/**
 * Run discovery for a single type
 */
export async function runSingleScreener(
  type: 'value' | 'special-sits' | 'distressed' | 'market-movers',
  maxResults: number = 10
): Promise<Opportunity[]> {
  const result = await runOpportunityDiscovery({
    discoveryTypes: [type],
    maxResults,
    enrichWithMetrics: true,
  });

  return result.opportunities;
}
