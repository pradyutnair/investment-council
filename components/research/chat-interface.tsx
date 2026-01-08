'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  sessionId: string;
  initialMessages: any[];
  researchReport: string | null;
  disabled?: boolean;
}

export function ChatInterface({ sessionId, initialMessages, researchReport, disabled }: ChatInterfaceProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/deliberation-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          context: researchReport,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';

      // Add placeholder for assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantMessage += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage };
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
      // Remove the user message if failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'user': return 'bg-primary';
      case 'assistant': return 'bg-green-600';
      case 'gemini': return 'bg-blue-600';
      case 'chatgpt': return 'bg-emerald-600';
      case 'claude': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const getAvatarLabel = (role: string) => {
    switch (role) {
      case 'user': return 'You';
      case 'assistant': return 'AI';
      case 'gemini': return 'Gem';
      case 'chatgpt': return 'GPT';
      case 'claude': return 'Cla';
      default: return role.charAt(0).toUpperCase();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">Start a conversation about this research</p>
              <p className="text-sm">Ask questions, request clarification, or discuss the findings</p>
            </div>
          ) : (
            messages.map((message, i) => (
              <div key={i} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role !== 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={getAvatarColor(message.role)}>
                      {getAvatarLabel(message.role)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {message.role !== 'user' && message.role !== 'assistant' && (
                    <Badge variant="outline" className="mb-2 text-xs">
                      {message.role}
                    </Badge>
                  )}
                  <div className={`prose prose-sm max-w-none ${
                    message.role === 'user' ? 'dark:prose-invert' : 'dark:prose-invert'
                  }`}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                {message.role === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary">
                      You
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-green-600">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or share your thoughts..."
            rows={2}
            className="flex-1 resize-none"
            disabled={disabled || isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || isLoading || !input.trim()}
            className="h-10 w-10 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
