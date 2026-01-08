'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { updateVerdict, getInterrogationMessages, addInterrogationMessage } from '@/lib/actions/deals';
import type { DealMemo, DealVerdict, InterrogationMessage } from '@/types/deals';
import { Send, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface InterrogationChatProps {
  deal: DealMemo;
}

export function InterrogationChat({ deal }: InterrogationChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<InterrogationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [verdict, setVerdict] = useState<DealVerdict | ''>(deal.verdict || '');
  const [verdictNote, setVerdictNote] = useState(deal.verdict_note || '');
  const [isSavingVerdict, setIsSavingVerdict] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [deal.id]);

  const loadMessages = async () => {
    const msgs = await getInterrogationMessages(deal.id);
    setMessages(msgs);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      // Add user message
      await addInterrogationMessage(deal.id, 'user', userMessage);
      
      // Call interrogation API for assistant response
      const response = await fetch('/api/interrogation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dealId: deal.id,
          message: userMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await addInterrogationMessage(deal.id, 'assistant', data.response);
        await loadMessages();
      } else {
        toast.error('Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('An error occurred');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveVerdict = async () => {
    if (!verdict) {
      toast.error('Please select a verdict');
      return;
    }

    setIsSavingVerdict(true);

    try {
      const result = await updateVerdict(deal.id, verdict as DealVerdict, verdictNote);
      if (result.success) {
        toast.success('Verdict saved and deal finalized');
        router.refresh();
      } else {
        toast.error('Failed to save verdict');
      }
    } catch (error) {
      console.error('Error saving verdict:', error);
      toast.error('An error occurred');
    } finally {
      setIsSavingVerdict(false);
    }
  };

  const verdictIcons = {
    invest: <CheckCircle className="w-5 h-5 text-green-600" />,
    pass: <XCircle className="w-5 h-5 text-red-600" />,
    watch: <Eye className="w-5 h-5 text-amber-600" />,
  };

  return (
    <div className="h-full flex">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4 max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Start asking questions about the deal. The AI has full context of the research report and council critiques.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Input */}
        <div className="p-4 border-t border-border/40">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask questions about the deal..."
              rows={2}
              className="resize-none"
              disabled={isSending || deal.status === 'finalized'}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending || deal.status === 'finalized'}
              size="icon"
              className="h-auto"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Verdict Widget */}
      <div className="w-96 border-l border-border/40">
        <Card className="h-full rounded-none border-0 shadow-none">
          <CardHeader>
            <CardTitle>Final Verdict</CardTitle>
            <CardDescription>
              Make your investment decision
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Verdict Selection */}
            <div className="space-y-2">
              <Label htmlFor="verdict">Decision</Label>
              <Select
                value={verdict}
                onValueChange={(value) => setVerdict(value as DealVerdict)}
                disabled={deal.status === 'finalized'}
              >
                <SelectTrigger id="verdict">
                  <SelectValue placeholder="Select verdict..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invest">
                    <div className="flex items-center gap-2">
                      {verdictIcons.invest}
                      <span>Invest</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pass">
                    <div className="flex items-center gap-2">
                      {verdictIcons.pass}
                      <span>Pass</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="watch">
                    <div className="flex items-center gap-2">
                      {verdictIcons.watch}
                      <span>Watch</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Verdict Note */}
            <div className="space-y-2">
              <Label htmlFor="verdict_note">Investment Note</Label>
              <Textarea
                id="verdict_note"
                value={verdictNote}
                onChange={(e) => setVerdictNote(e.target.value)}
                placeholder="Summarize your final decision and rationale..."
                rows={8}
                className="resize-none"
                disabled={deal.status === 'finalized'}
              />
            </div>

            {/* Save Button */}
            {deal.status !== 'finalized' ? (
              <Button
                onClick={handleSaveVerdict}
                disabled={!verdict || isSavingVerdict}
                className="w-full"
                size="lg"
              >
                {isSavingVerdict ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  'Finalize Verdict'
                )}
              </Button>
            ) : (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Deal Finalized</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(deal.finalized_at!).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
