'use server'

import { createClient } from '@/lib/supabase/server'
import type { ResearchStrategy } from '@/src/types/research'

export interface ResearchSession {
  id: string
  user_id: string
  title: string
  thesis: string
  strategy: ResearchStrategy
  status: 'pending' | 'discovering' | 'researching' | 'analyzing' | 'deliberation' | 'finalized'
  research_report: string | null
  research_started_at: string | null
  research_completed_at: string | null
  council_analyses: any[]
  council_debate: any[]
  council_started_at: string | null
  council_completed_at: string | null
  verdict: string | null
  verdict_note: string | null
  confidence_level: string | null
  finalized_at: string | null
  discovered_opportunities: any[]
  final_verdict: any
  created_at: string
  updated_at: string
}

export interface ResearchOpportunity {
  id: string
  session_id: string
  ticker: string
  company_name: string
  thesis: string
  type: string
  key_metrics: Record<string, number>
  risk_level: 'low' | 'medium' | 'high'
  score: number | null
  research_report: string | null
  strategy_analysis: string | null
  critiques: {
    skeptic?: { content: string; agent: string }
    risk_officer?: { content: string; agent: string }
  }
  verdict: string | null
  final_score: number | null
  status: 'pending' | 'researching' | 'analyzing' | 'completed' | 'failed'
  errors: string[]
  created_at: string
  updated_at: string
}

export async function getUserResearchSessions(): Promise<ResearchSession[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('research_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getResearchSession(sessionId: string): Promise<ResearchSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('research_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data
}

export async function createResearchSession(
  title: string, 
  thesis: string, 
  strategy: ResearchStrategy = 'general'
): Promise<ResearchSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('research_sessions')
    .insert({
      user_id: user.id,
      title,
      thesis,
      strategy,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateResearchReport(sessionId: string, report: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('research_sessions')
    .update({
      research_report: report,
      research_completed_at: new Date().toISOString(),
      status: 'council_gather',
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function addCouncilAnalysis(sessionId: string, agentName: string, analysis: string): Promise<void> {
  const supabase = await createClient()

  // First get the current session
  const { data: session } = await supabase
    .from('research_sessions')
    .select('council_analyses, council_started_at')
    .eq('id', sessionId)
    .single()

  if (!session) throw new Error('Session not found')

  const newAnalysis = {
    agent: agentName,
    analysis,
    timestamp: new Date().toISOString(),
  }

  const updatedAnalyses = [...(session.council_analyses || []), newAnalysis]

  const { error } = await supabase
    .from('research_sessions')
    .update({
      council_analyses: updatedAnalyses,
      council_started_at: session.council_started_at || new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function updateCouncilDebate(sessionId: string, debate: any[]): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('research_sessions')
    .update({
      council_debate: debate,
      council_completed_at: new Date().toISOString(),
      status: 'deliberation',
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function setVerdict(
  sessionId: string,
  verdict: 'invest' | 'pass' | 'watch' | 'needs_more_research',
  note: string,
  confidence: 'high' | 'medium' | 'low'
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('research_sessions')
    .update({
      verdict,
      verdict_note: note,
      confidence_level: confidence,
      finalized_at: new Date().toISOString(),
      status: 'finalized',
    })
    .eq('id', sessionId)

  if (error) throw error
}

export async function deleteResearchSession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('research_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

// Deliberation messages
export async function getDeliberationMessages(sessionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliberation_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createDeliberationMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'gemini' | 'chatgpt' | 'claude',
  content: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('deliberation_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// THESIS-BASED WORKFLOW FUNCTIONS
// ============================================================================

/**
 * Get all opportunities for a research session
 */
export async function getResearchOpportunities(sessionId: string): Promise<ResearchOpportunity[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('research_opportunities')
    .select('*')
    .eq('session_id', sessionId)
    .order('score', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data || []
}

/**
 * Insert discovered opportunities for a session
 */
export async function insertDiscoveredOpportunities(
  sessionId: string,
  opportunities: Array<{
    ticker: string
    companyName: string
    thesis: string
    type: string
    keyMetrics: Record<string, number>
    riskLevel: 'low' | 'medium' | 'high'
    score: number
  }>
): Promise<void> {
  const supabase = await createClient()

  const records = opportunities.map(opp => ({
    session_id: sessionId,
    ticker: opp.ticker,
    company_name: opp.companyName,
    thesis: opp.thesis,
    type: opp.type,
    key_metrics: opp.keyMetrics,
    risk_level: opp.riskLevel,
    score: opp.score,
    status: 'pending' as const,
  }))

  const { error } = await supabase
    .from('research_opportunities')
    .insert(records)

  if (error) throw error
}

/**
 * Update a single opportunity with analysis results
 */
export async function updateOpportunityAnalysis(
  opportunityId: string,
  data: {
    research_report?: string
    strategy_analysis?: string
    critiques?: {
      skeptic?: { content: string; agent: string }
      risk_officer?: { content: string; agent: string }
    }
    verdict?: string
    final_score?: number
    status?: 'pending' | 'researching' | 'analyzing' | 'completed' | 'failed'
    errors?: string[]
  }
): Promise<void> {
  const supabase = await createClient()

  const updateData: Record<string, any> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('research_opportunities')
    .update(updateData)
    .eq('id', opportunityId)

  if (error) throw error
}

/**
 * Update session status and discovered opportunities
 */
export async function updateSessionDiscoveredOpportunities(
  sessionId: string,
  opportunities: any[]
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('research_sessions')
    .update({
      discovered_opportunities: opportunities,
      status: 'researching',
      research_started_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

/**
 * Set session final verdict
 */
export async function setSessionFinalVerdict(
  sessionId: string,
  finalVerdict: {
    decision: 'invest' | 'pass' | 'watch'
    confidence: number
    topPick: string
    rationale: string
  }
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('research_sessions')
    .update({
      final_verdict: {
        ...finalVerdict,
        timestamp: new Date().toISOString(),
      },
      status: 'deliberation',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) throw error
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: 'pending' | 'discovering' | 'researching' | 'analyzing' | 'deliberation' | 'finalized'
): Promise<void> {
  const supabase = await createClient()

  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'discovering') {
    // No additional fields
  } else if (status === 'researching') {
    updateData.research_started_at = new Date().toISOString()
  } else if (status === 'analyzing') {
    updateData.research_completed_at = new Date().toISOString()
  } else if (status === 'deliberation') {
    updateData.council_completed_at = new Date().toISOString()
  } else if (status === 'finalized') {
    updateData.finalized_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('research_sessions')
    .update(updateData)
    .eq('id', sessionId)

  if (error) throw error
}
