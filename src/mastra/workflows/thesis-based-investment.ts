/**
 * Simplified Investment Research Workflow
 * 
 * Simple flow:
 * 1. Take user's thesis/strategy
 * 2. Run Gemini research
 * 3. Return report
 */

import { geminiResearch } from '@/src/services/gemini-research';

export interface ResearchInput {
  thesis: string;
  strategy: 'value' | 'special-sits' | 'distressed' | 'general';
}

export interface ResearchOutput {
  thesis: string;
  strategy: string;
  report: string;
  duration: number;
  error?: string;
}

/**
 * Run investment research using Gemini
 */
export async function runResearch(
  input: ResearchInput,
  onProgress?: (message: string) => void
): Promise<ResearchOutput> {
  const startTime = Date.now();
  const { thesis, strategy } = input;

  onProgress?.('Starting Gemini deep research...');

  let report = '';
  let error: string | undefined;

  for await (const step of geminiResearch.startResearch({ thesis, strategy })) {
    if (step.type === 'complete') {
      report = step.report;
      onProgress?.('Research complete!');
      break;
    } else if (step.type === 'progress') {
      onProgress?.(step.content);
    } else if (step.type === 'thinking') {
      onProgress?.(step.content);
    } else if (step.type === 'error') {
      error = step.content;
      break;
    }
  }

  return {
    thesis,
    strategy,
    report,
    duration: Date.now() - startTime,
    error,
  };
}
