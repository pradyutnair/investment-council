/**
 * Research Types and Strategy Definitions
 * 
 * Defines the different research strategies available through the mastra agents.
 */

export type ResearchStrategy = 'value' | 'special-sits' | 'distressed' | 'general';

export interface StrategyConfig {
  id: ResearchStrategy;
  name: string;
  shortName: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
  bgColor: string;
  agentName: string;
  philosophy: string;
  keyFocus: string[];
}

export const RESEARCH_STRATEGIES: Record<ResearchStrategy, StrategyConfig> = {
  value: {
    id: 'value',
    name: 'Value Investing',
    shortName: 'Value',
    description: 'Benjamin Graham & Bruce Greenwald approach. Focus on margin of safety, intrinsic value, and steady cash flows.',
    icon: 'TrendingUp',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    agentName: 'value-investor',
    philosophy: 'Margin of safety is paramount. Focus on Book Value and Franchise Value.',
    keyFocus: [
      'Earnings Power Value (EPV)',
      'Asset Valuation',
      'Margin of Safety',
      'Competitive Moat Analysis',
    ],
  },
  'special-sits': {
    id: 'special-sits',
    name: 'Special Situations',
    shortName: 'Special Sits',
    description: 'Joel Greenblatt style event-driven investing. Spinoffs, merger arbitrage, and restructuring plays.',
    icon: 'Sparkles',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    agentName: 'special-situations-investor',
    philosophy: 'Corporate events create mispricing opportunities.',
    keyFocus: [
      'Spinoffs & Stub Trades',
      'Merger Arbitrage',
      'Restructuring Opportunities',
      'Catalyst Identification',
    ],
  },
  distressed: {
    id: 'distressed',
    name: 'Distressed Investing',
    shortName: 'Distressed',
    description: 'Howard Marks & Oaktree style contrarian investing. Focus on market cycles and distressed securities.',
    icon: 'AlertTriangle',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    agentName: 'distressed-investor',
    philosophy: 'Buy when others are fearful. Market cycles create opportunities.',
    keyFocus: [
      'Market Cycle Analysis',
      'Distressed Debt',
      'Turnaround Situations',
      'Forced Seller Dynamics',
    ],
  },
  general: {
    id: 'general',
    name: 'General Research',
    shortName: 'General',
    description: 'Comprehensive deep research without a specific strategy lens. Best for exploratory analysis.',
    icon: 'Search',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    agentName: 'general',
    philosophy: 'Thorough multi-angle analysis of investment opportunities.',
    keyFocus: [
      'Business Analysis',
      'Financial Deep Dive',
      'Industry Context',
      'Risk Assessment',
    ],
  },
};

export function getStrategyConfig(strategy: ResearchStrategy): StrategyConfig {
  return RESEARCH_STRATEGIES[strategy] || RESEARCH_STRATEGIES.general;
}

export function getAllStrategies(): StrategyConfig[] {
  return Object.values(RESEARCH_STRATEGIES);
}
