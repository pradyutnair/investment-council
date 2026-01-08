'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAgent } from '@/components/dashboard/agent-provider'
import { AgentSelector } from '@/components/dashboard/agent-selector'
import { ChatInput } from '@/components/dashboard/chat-input'
import { ChatMessage } from '@/components/dashboard/chat-message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { createSession, createMessage } from '@/lib/actions/sessions'
import type { AgentId } from '@/types/database'

export default function DashboardPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { selectedAgent } = useAgent()

  const handleSendMessage = async (content: string) => {
    setIsLoading(true)

    // Add user message
    const userMessage = { role: 'user', content }
    setMessages(prev => [...prev, userMessage])

    try {
      // Create session if not exists
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const session = await createSession(selectedAgent as AgentId, content.slice(0, 50) + '...')
        currentSessionId = session.id
        setSessionId(currentSessionId)
      }

      // Save user message
      await createMessage(currentSessionId, 'user', content)

      // Stream response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          agentId: selectedAgent,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break

              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  assistantContent += parsed.text
                  setMessages(prev => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage?.role === 'assistant') {
                      lastMessage.content = assistantContent
                    } else {
                      newMessages.push({ role: 'assistant', content: assistantContent })
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Save assistant message
      if (assistantContent && currentSessionId) {
        await createMessage(currentSessionId, 'assistant', assistantContent)
      }

      // Redirect to session page
      if (currentSessionId) {
        router.push(`/dashboard/chat/${currentSessionId}`)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4 bg-background">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium">Investment Council</h1>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">New analysis</span>
          </div>
          <AgentSelector />
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <p className="text-sm text-muted-foreground">
                Start a new investment analysis with one of our AI advisors.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-8 px-6">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                message={{
                  id: `temp-${idx}`,
                  session_id: 'temp',
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                  created_at: new Date().toISOString(),
                }}
                agentName="AI"
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}
