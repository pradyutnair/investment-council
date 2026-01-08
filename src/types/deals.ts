export type DealStatus = 'scouting' | 'researching' | 'council_review' | 'interrogation' | 'finalized';

export type DealVerdict = 'invest' | 'pass' | 'watch';

export interface ContextFile {
  name: string;
  url: string;
  type: string;
}

export interface Critique {
  content: string;
  timestamp: string;
}

export interface DealCritiques {
  skeptic?: Critique;
  risk_officer?: Critique;
}

export interface DealMemo {
  id: string;
  user_id: string;
  company_name: string;
  ticker: string | null;
  status: DealStatus;
  thesis: string;
  context_files: ContextFile[];
  council_enabled: boolean;
  research_report: string | null;
  research_started_at: string | null;
  research_completed_at: string | null;
  critiques: DealCritiques | null;
  council_convened_at: string | null;
  verdict: DealVerdict | null;
  verdict_note: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterrogationMessage {
  id: string;
  deal_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
