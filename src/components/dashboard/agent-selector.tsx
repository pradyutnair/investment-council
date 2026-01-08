'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { useAgent } from './agent-provider'
import type { AgentId } from '@/types/database'

const AGENTS = [
  { id: 'value-investor' as AgentId, name: 'Value Investor', description: 'Benjamin Graham style' },
  { id: 'special-situations-investor' as AgentId, name: 'Special Situations', description: 'Joel Greenblatt style' },
  { id: 'distressed-investor' as AgentId, name: 'Distressed Investor', description: 'Howard Marks style' },
]

export function AgentSelector() {
  const { selectedAgent, setSelectedAgent } = useAgent()
  const currentAgent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <span>{currentAgent.name}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {AGENTS.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className="flex flex-col items-start cursor-pointer py-2"
          >
            <span className="text-sm font-medium">{agent.name}</span>
            <span className="text-xs text-muted-foreground">{agent.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
