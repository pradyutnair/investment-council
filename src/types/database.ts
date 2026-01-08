export type AgentId = 'value-investor' | 'special-situations-investor' | 'distressed-investor'

export interface ChatSession {
  id: string
  user_id: string
  agent_id: AgentId
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Agent {
  id: AgentId
  name: string
}
