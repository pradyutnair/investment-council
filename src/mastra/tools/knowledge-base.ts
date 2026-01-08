import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Vector index instance
 * Will be initialized by the RAG setup module
 */
let vectorIndex: any = null;

/**
 * Set the vector index for the knowledge base tool
 * Called during initialization from rag.ts
 */
export function setVectorIndex(index: any): void {
  vectorIndex = index;
}

/**
 * Input schema for knowledge base search tool
 */
const inputSchema = z.object({
  query: z.string().min(1).describe('Search query for investment knowledge'),
  category: z.string().optional().describe('Filter by investment category (e.g., "value_investing", "distressed")'),
  topK: z.number().min(1).max(10).default(3).describe('Number of results to return'),
});

/**
 * Output schema for knowledge base search tool
 */
const outputSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      content: z.string(),
      category: z.string(),
      score: z.number(),
      metadata: z.any(),
    })
  ),
  count: z.number(),
});

/**
 * Knowledge Base Search Tool
 *
 * Searches the vector database for investment wisdom and concepts.
 * The knowledge base contains content from classic investment books
 * categorized by investment philosophy.
 *
 * Supported categories:
 * - value_investing: Benjamin Graham, Bruce Greenwald style value investing
 * - special_situations: Joel Greenblatt style special situations
 * - distressed: Howard Marks style distressed debt and market cycles
 */
export const searchInvestmentWisdom = createTool({
  id: 'search-investment-wisdom',
  description: `Search the investment knowledge base for relevant wisdom and concepts.

The knowledge base contains content from classic investment books categorized by philosophy:
- value_investing: Benjamin Graham, Bruce Greenwald style value investing
- special_situations: Joel Greenblatt style special situations
- distressed: Howard Marks style distressed debt and market cycles

Use this tool when you need to reference investment principles, historical examples, or frameworks from these investment legends.`,
  inputSchema,
  outputSchema,
  execute: async ({ context }) => {
    const { query, category, topK = 3 } = context;

    if (!vectorIndex) {
      throw new Error('Vector index not initialized. Call setVectorIndex() first.');
    }

    try {
      // Build filter object if category specified
      const filter = category ? { category } : undefined;

      // Search vector index
      const results = await vectorIndex.query({
        query,
        topK,
        filter,
      });

      return {
        query,
        results: results.map((result: any) => ({
          content: result.content,
          category: result.metadata?.category || 'unknown',
          score: result.score,
          metadata: result.metadata,
        })),
        count: results.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to search knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});
