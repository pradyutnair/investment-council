import { Mastra } from '@mastra/core';
import { valueAgent } from './agents/value-agent';
import { specialSitsAgent } from './agents/special-sits-agent';
import { distressedAgent } from './agents/distressed-agent';
import { skepticAgent } from './agents/skeptic-agent';
import { riskOfficerAgent } from './agents/risk-officer-agent';
import { valueScreenerAgent } from './agents/value-screener-agent';
import { specialSitsScreenerAgent } from './agents/special-sits-screener-agent';
import { distressedScreenerAgent } from './agents/distressed-screener-agent';
import { marketMoversAgent } from './agents/market-movers-agent';
import { verdictAgent } from './agents/verdict-agent';
import { vectorStore } from './rag';

/**
 * Main Mastra Instance
 *
 * Central orchestration point for all agents and vector storage.
 * Export as singleton to be used throughout the application.
 */
export const mastra = new Mastra({
  agents: {
    // Strategy agents (for analyzing opportunities)
    valueAgent,
    specialSitsAgent,
    distressedAgent,

    // Discovery agents (for finding opportunities)
    valueScreenerAgent,
    specialSitsScreenerAgent,
    distressedScreenerAgent,
    marketMoversAgent,

    // Critique agents (for stress-testing research)
    skepticAgent,
    riskOfficerAgent,

    // Verdict agent (for final investment decision)
    verdictAgent,
  },
  ...(vectorStore && {
    vectors: {
      vectorStore,
    },
  }),
});

/**
 * Get an agent by ID
 *
 * @param agentId - The agent identifier
 * @returns The agent instance
 * @throws Error if agent not found
 */
export function getAgent(agentId: string) {
  const agents = mastra.getAgents();

  // agents is an object with agent names as keys
  const agentKeys = Object.keys(agents);
  const agentKey = agentKeys.find((key) => {
    const agent = agents[key as keyof typeof agents] as any;
    return agent?.name === agentId;
  });

  if (!agentKey) {
    const availableIds = agentKeys.map((key) => {
      const agent = agents[key as keyof typeof agents] as any;
      return agent?.name || key;
    }).join(', ');
    throw new Error(
      `Agent not found: ${agentId}. Available agents: ${availableIds}`
    );
  }

  return agents[agentKey as keyof typeof agents];
}

/**
 * Get all available agent IDs
 */
export function getAvailableAgents(): string[] {
  const agents = mastra.getAgents();
  return Object.values(agents).map((agent: any) => agent.name);
}

/**
 * Get a screener agent by type
 *
 * @param type - The type of screener ('value', 'special-sits', 'distressed', 'market-movers')
 * @returns The screener agent
 * @throws Error if agent type not found
 */
export function getScreenerAgent(type: string) {
  const agentMap = {
    'value': valueScreenerAgent,
    'special-sits': specialSitsScreenerAgent,
    'distressed': distressedScreenerAgent,
    'market-movers': marketMoversAgent,
  };

  const agent = agentMap[type as keyof typeof agentMap];

  if (!agent) {
    throw new Error(
      `Unknown screener type: ${type}. Available types: ${Object.keys(agentMap).join(', ')}`
    );
  }

  return agent;
}

/**
 * Get a strategy agent by type
 *
 * @param type - The type of strategy ('value', 'special-sits', 'distressed')
 * @returns The strategy agent
 * @throws Error if agent type not found
 */
export function getStrategyAgent(type: string) {
  const agentMap = {
    'value': valueAgent,
    'special-sits': specialSitsAgent,
    'distressed': distressedAgent,
  };

  const agent = agentMap[type as keyof typeof agentMap];

  if (!agent) {
    throw new Error(
      `Unknown strategy type: ${type}. Available types: ${Object.keys(agentMap).join(', ')}`
    );
  }

  return agent;
}

// Export individual agents for direct access
// Strategy agents
export { valueAgent, specialSitsAgent, distressedAgent };

// Discovery agents
export { valueScreenerAgent, specialSitsScreenerAgent, distressedScreenerAgent, marketMoversAgent };

// Critique agents
export { skepticAgent, riskOfficerAgent };

// Verdict agent
export { verdictAgent };
