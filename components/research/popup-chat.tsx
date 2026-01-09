'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, User, Bot, MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface PopupChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  initialMessages: any[];
  researchReport: string | null;
  disabled?: boolean;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export function PopupChat({
  open,
  onOpenChange,
  sessionId,
  initialMessages,
  researchReport,
  disabled,
  initialPrompt = '',
  onClearInitialPrompt,
}: PopupChatProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set initial prompt when provided
  useEffect(() => {
    if (open && initialPrompt) {
      // Format as a question about the selected text
      const formattedPrompt = `Regarding this: "${initialPrompt.slice(0, 500)}${initialPrompt.length > 500 ? '...' : ''}" \n\n`;
      setInput(formattedPrompt);
      // Clear the initial prompt after setting it
      onClearInitialPrompt?.();
      // Focus textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        const len = formattedPrompt.length;
        textareaRef.current?.setSelectionRange(len, len);
      }, 100);
    }
  }, [open, initialPrompt, onClearInitialPrompt]);

  // Focus textarea when popup opens without initial prompt
  useEffect(() => {
    if (open && !initialPrompt) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open, initialPrompt]);

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

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed z-50 bg-background border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-200 ease-out",
        isExpanded
          ? "bottom-4 right-4 w-[480px] h-[600px]"
          : "bottom-4 right-4 w-[380px] h-[500px]"
      )}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between rounded-t-2xl bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Research Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <p className="text-[14px] font-medium mb-1">Research Assistant</p>
              <p className="text-[12px] text-muted-foreground max-w-[200px] mx-auto">
                Ask questions about the research report or select text to discuss
              </p>
            </div>
          ) : (
            messages.map((message, i) => (
              <div key={i} className={cn("flex gap-3", message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className={cn(
                    "text-[10px] font-medium",
                    message.role === 'user' ? 'bg-foreground text-background' : 'bg-primary/10 text-primary'
                  )}>
                    {message.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex-1 min-w-0 max-w-[85%]",
                  message.role === 'user' && 'flex justify-end'
                )}>
                  <div className={cn(
                    "rounded-2xl px-3 py-2 text-[13px]",
                    message.role === 'user'
                      ? 'bg-foreground text-background rounded-tr-md'
                      : 'bg-muted rounded-tl-md'
                  )}>
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      message.role === 'user' ? 'prose-invert' : 'dark:prose-invert',
                      "prose-p:text-[13px] prose-p:leading-relaxed prose-p:my-1"
                    )}>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot className="w-3.5 h-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-tl-md px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0 rounded-b-2xl bg-muted/20">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the research..."
            rows={2}
            className="flex-1 resize-none min-h-[56px] max-h-28 text-[13px] rounded-xl border-muted-foreground/20 focus:border-primary"
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
            className="h-10 w-10 rounded-xl shrink-0 self-end"
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
