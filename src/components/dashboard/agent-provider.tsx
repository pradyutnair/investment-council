'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AgentId } from '@/types/database'

interface AgentContextType {
  selectedAgent: AgentId
  setSelectedAgent: (agent: AgentId) => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('value-investor')

  useEffect(() => {
    // Load from URL params on mount
    const params = new URLSearchParams(window.location.search)
    const agentParam = params.get('agent') as AgentId
    if (agentParam && ['value-investor', 'special-situations-investor', 'distressed-investor'].includes(agentParam)) {
      setSelectedAgent(agentParam)
    }
  }, [])

  return (
    <AgentContext.Provider value={{ selectedAgent, setSelectedAgent }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider')
  }
  return context
}
