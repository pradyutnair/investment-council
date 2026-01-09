'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Send, User, Bot, MessageSquare, X } from 'lucide-react';
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
}

export function PopupChat({
  open,
  onOpenChange,
  sessionId,
  initialMessages,
  researchReport,
  disabled,
  initialPrompt = '',
}: PopupChatProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSetInitialPrompt = useRef(false);

  // Set initial prompt when popup opens with selected text
  useEffect(() => {
    if (open && initialPrompt && !hasSetInitialPrompt.current) {
      // Format as a question about the selected text
      const formattedPrompt = `Regarding this: "${initialPrompt.slice(0, 500)}${initialPrompt.length > 500 ? '...' : ''}"`;
      setInput(formattedPrompt);
      hasSetInitialPrompt.current = true;
      // Focus textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        textareaRef.current?.setSelectionRange(
          formattedPrompt.length,
          formattedPrompt.length
        );
      }, 150);
    }
  }, [open, initialPrompt]);

  // Reset the flag when popup closes
  useEffect(() => {
    if (!open) {
      hasSetInitialPrompt.current = false;
    }
  }, [open]);

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

  // Focus textarea when sheet opens (without initial prompt)
  useEffect(() => {
    if (open && !initialPrompt) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open, initialPrompt]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-md p-0 flex flex-col gap-0",
          "data-[state=open]:animate-in data-[state=closed]:animate-out"
        )}
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <SheetTitle className="text-base font-semibold">Research Chat</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div ref={scrollRef} className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-foreground/5 mb-3">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-[14px] font-medium mb-1">Start a conversation</p>
                <p className="text-[12px] text-muted-foreground">Ask questions about the research</p>
              </div>
            ) : (
              messages.map((message, i) => (
                <div key={i} className={cn("flex gap-3", message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className={cn(
                      "text-[10px] font-medium",
                      message.role === 'user' ? 'bg-foreground text-background' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    )}>
                      {message.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "flex-1 min-w-0 max-w-[85%]",
                    message.role === 'user' && 'flex justify-end'
                  )}>
                    <div className={cn(
                      "rounded-xl px-3 py-2 text-[13px]",
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
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Bot className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-xl rounded-tl-md px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              ref={textareaRef}
              data-popup-chat-input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the research..."
              rows={2}
              className="flex-1 resize-none min-h-[60px] max-h-32 text-[13px] rounded-lg"
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
              className="h-10 w-10 rounded-lg shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
