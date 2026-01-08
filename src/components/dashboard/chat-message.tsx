import type { ChatMessage } from '@/types/database'

interface ChatMessageProps {
  message: ChatMessage
  agentName: string
}

export function ChatMessage({ message, agentName }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`
          w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium
          ${isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
          }
        `}>
          {isUser ? 'U' : agentName.charAt(0)}
        </div>
        <div className={`
          rounded-xl px-4 py-2.5 text-sm leading-relaxed
          ${isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/80 text-foreground'
          }
        `}>
          {message.content}
        </div>
      </div>
    </div>
  )
}
