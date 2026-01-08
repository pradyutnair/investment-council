import { Mastra } from '@mastra/core';
import { valueAgent } from './agents/value-agent';
import { specialSitsAgent } from './agents/special-sits-agent';
import { distressedAgent } from './agents/distressed-agent';
import { vectorStore } from './rag';

/**
 * Main Mastra Instance
 *
 * Central orchestration point for all agents and vector storage.
 * Export as singleton to be used throughout the application.
 */
export const mastra = new Mastra({
  agents: {
    valueAgent,
    specialSitsAgent,
    distressedAgent,
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
 * @param agentId - The agent identifier ('value-investor', 'special-situations-investor', 'distressed-investor')
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

// Export individual agents for direct access
export { valueAgent, specialSitsAgent, distressedAgent };
