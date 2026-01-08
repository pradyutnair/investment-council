'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { useAgent } from './agent-provider'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('')
  const { selectedAgent } = useAgent()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const agentLabel = selectedAgent
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <form onSubmit={handleSubmit} className="border-t border-border/40 p-4 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about an investment..."
            disabled={isLoading}
            className="flex-1 h-10 px-3.5 text-sm rounded-lg border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-10 px-3 rounded-lg"
            size="icon"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/80 mt-2 px-1">
          {agentLabel}
        </p>
      </div>
    </form>
  )
}
