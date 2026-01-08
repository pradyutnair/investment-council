'use server'

import { createClient } from '@/lib/supabase/server'
import type { ChatSession, ChatMessage, AgentId } from '@/types/database'

export async function getUserSessions(): Promise<ChatSession[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createSession(agentId: AgentId, title?: string): Promise<ChatSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      agent_id: agentId,
      title: title || 'New Analysis',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chat_messages')
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

export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId)

  if (error) throw error
}
