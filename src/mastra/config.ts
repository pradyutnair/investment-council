import { createOpenAI } from '@ai-sdk/openai';

/**
 * Environment validation and configuration
 * Validates that all required environment variables are set at startup
 */

const requiredEnvVars = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  FMP_API_KEY: process.env.FMP_API_KEY,
} as const;

// Optional environment variables (for RAG functionality)
const optionalEnvVars = {
  POSTGRES_CONNECTION_STRING: process.env.POSTGRES_CONNECTION_STRING,
} as const;

// Validate required environment variables at startup
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

/**
 * OpenAI provider for all agents
 * Mastra expects a provider instance
 */
export const openaiProvider = createOpenAI({
  apiKey: requiredEnvVars.OPENAI_API_KEY,
});

/**
 * Export validated configuration
 * Provides type-safe access to environment variables
 */
export const config = {
  fmpApiKey: requiredEnvVars.FMP_API_KEY,
  postgresConnectionString: optionalEnvVars.POSTGRES_CONNECTION_STRING,
  openaiModelId: 'gpt-4o',
} as const;
