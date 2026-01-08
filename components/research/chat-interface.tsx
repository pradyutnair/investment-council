'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, User, Bot } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

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

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';

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
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-foreground/5 mb-4">
                <Bot className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-[15px] font-medium mb-1">Start a conversation</p>
              <p className="text-[13px] text-muted-foreground">Ask questions about the research or discuss the findings</p>
            </div>
          ) : (
            messages.map((message, i) => (
              <div key={i} className={cn("flex gap-4", message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className={cn(
                    "text-[11px] font-medium",
                    message.role === 'user' ? 'bg-foreground text-background' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  )}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex-1 min-w-0 max-w-[85%]",
                  message.role === 'user' && 'flex justify-end'
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-3",
                    message.role === 'user' 
                      ? 'bg-foreground text-background rounded-tr-md' 
                      : 'bg-muted rounded-tl-md'
                  )}>
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      message.role === 'user' ? 'prose-invert' : 'dark:prose-invert',
                      "prose-p:text-[14px] prose-p:leading-relaxed prose-p:my-1"
                    )}>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the research..."
              rows={1}
              className="flex-1 resize-none min-h-[44px] max-h-32 text-[14px] rounded-xl"
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
              className="h-11 w-11 rounded-xl shrink-0"
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
    </div>
  );
}
