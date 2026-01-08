'use server'

import { createClient } from '@/lib/supabase/server'

export interface ResearchSession {
  id: string
  user_id: string
  title: string
  thesis: string
  status: 'researching' | 'council_gather' | 'council_debate' | 'deliberation' | 'finalized'
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

export async function createResearchSession(title: string, thesis: string): Promise<ResearchSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('research_sessions')
    .insert({
      user_id: user.id,
      title,
      thesis,
      status: 'researching',
      research_started_at: new Date().toISOString(),
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
    .select('council_analyses')
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
