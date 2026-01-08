'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAgent } from '@/components/dashboard/agent-provider'
import { AgentSelector } from '@/components/dashboard/agent-selector'
import { ChatInput } from '@/components/dashboard/chat-input'
import { ChatMessage } from '@/components/dashboard/chat-message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createMessage, getSessionMessages, updateSessionTitle } from '@/lib/actions/sessions'
import type { ChatMessage as ChatMessageType } from '@/types/database'

export default function ChatSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const { selectedAgent } = useAgent()
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [sessionId])

  const loadMessages = async () => {
    try {
      const data = await getSessionMessages(sessionId)
      setMessages(data)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    setIsLoading(true)

    const userMessage: ChatMessageType = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Save user message
      await createMessage(sessionId, 'user', content)

      // Update session title if first message
      if (messages.length === 0) {
        await updateSessionTitle(sessionId, content.slice(0, 50) + '...')
      }

      // Stream response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          agentId: selectedAgent,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let tempAssistantMessage: ChatMessageType | null = null

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

                  if (!tempAssistantMessage) {
                    const newMessage: ChatMessageType = {
                      id: `temp-assistant-${Date.now()}`,
                      session_id: sessionId,
                      role: 'assistant',
                      content: assistantContent,
                      created_at: new Date().toISOString(),
                    }
                    tempAssistantMessage = newMessage
                    setMessages(prev => [...prev, newMessage])
                  } else {
                    tempAssistantMessage.content = assistantContent
                    setMessages(prev => {
                      const newMessages = [...prev]
                      newMessages[newMessages.length - 1] = tempAssistantMessage!
                      return newMessages
                    })
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await createMessage(sessionId, 'assistant', assistantContent)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const getAgentName = () => {
    return selectedAgent
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const getTitle = () => {
    if (messages.length === 0) return 'New conversation'
    return messages[0].content.slice(0, 40) + (messages[0].content.length > 40 ? '...' : '')
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4 bg-background">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium">Investment Council</h1>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">{getTitle()}</span>
          </div>
          <AgentSelector />
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto py-8 px-6">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              agentName={getAgentName()}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}
