'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, MessageSquare, Users, CheckCircle2, AlertCircle, ArrowRight, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatInterface } from './chat-interface';
import { VerdictForm } from './verdict-form';
import type { ResearchSession } from '@/lib/actions/research';
import { cn } from '@/lib/utils';

interface ResearchViewProps {
  session: ResearchSession;
  initialMessages: any[];
}

export function ResearchView({ session, initialMessages }: ResearchViewProps) {
  const router = useRouter();
  const [status, setStatus] = useState(session.status);
  const [researchReport, setResearchReport] = useState(session.research_report);
  const [councilAnalyses, setCouncilAnalyses] = useState(session.council_analyses || []);
  const [councilDebate, setCouncilDebate] = useState(session.council_debate || []);
  const [verdict, setVerdict] = useState(session.verdict);

  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [isCouncilRunning, setIsCouncilRunning] = useState(false);

  const startResearch = async () => {
    setIsResearching(true);
    setResearchError(null);
    setStatus('researching');

    try {
      const response = await fetch('/api/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) throw new Error('Failed to start research');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              if (data.type === 'complete') {
                setResearchReport(data.report);
                setStatus('council_gather');
                router.refresh();
              } else if (data.type === 'error') {
                setResearchError(data.content || 'Research failed');
                setIsResearching(false);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Research error:', error);
      setResearchError(error instanceof Error ? error.message : 'Failed to complete research');
    } finally {
      setIsResearching(false);
    }
  };

  const startCouncil = async () => {
    setIsCouncilRunning(true);

    try {
      const response = await fetch('/api/council/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) throw new Error('Failed to start council analysis');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              if (data.type === 'analysis') {
                setCouncilAnalyses((prev) => [
                  ...prev,
                  { agent: data.agent, role: data.role, analysis: data.content, timestamp: new Date().toISOString() },
                ]);
              } else if (data.type === 'debate_round') {
                setCouncilDebate((prev) => [...prev, data]);
              } else if (data.type === 'complete') {
                setStatus('deliberation');
                router.refresh();
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Council error:', error);
    } finally {
      setIsCouncilRunning(false);
    }
  };

  const getStatusConfig = () => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'Ready', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400', icon: <FileText className="w-3 h-3" /> },
      researching: { label: 'Researching', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      council_gather: { label: 'Council Ready', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Users className="w-3 h-3" /> },
      council_debate: { label: 'Debating', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      deliberation: { label: 'Deliberation', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <MessageSquare className="w-3 h-3" /> },
      finalized: { label: 'Finalized', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="text-[15px] font-medium truncate">{session.title}</h1>
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium", statusConfig.color)}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="research" className="h-full flex flex-col">
          <div className="px-6 border-b border-border">
            <TabsList className="h-11 bg-transparent p-0 gap-6">
              <TabsTrigger 
                value="research" 
                className="h-11 px-0 pb-0 data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-foreground rounded-none text-[13px] font-medium"
              >
                <FileText className="w-4 h-4 mr-2" />
                Research
                {researchReport && <CheckCircle2 className="w-3.5 h-3.5 ml-2 text-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger 
                value="council" 
                className="h-11 px-0 pb-0 data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-foreground rounded-none text-[13px] font-medium"
                disabled={!researchReport}
              >
                <Users className="w-4 h-4 mr-2" />
                Council
                {councilAnalyses.length > 0 && <CheckCircle2 className="w-3.5 h-3.5 ml-2 text-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger 
                value="deliberation" 
                className="h-11 px-0 pb-0 data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-foreground rounded-none text-[13px] font-medium"
                disabled={status === 'pending' || status === 'researching'}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Research Tab */}
          <TabsContent value="research" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto px-6 py-8">
                {!researchReport ? (
                  <div className="py-12">
                    {researchError ? (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mb-4">
                          <AlertCircle className="w-7 h-7 text-destructive" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Research Failed</h3>
                        <p className="text-[14px] text-muted-foreground mb-6 max-w-sm mx-auto">{researchError}</p>
                        <Button onClick={startResearch} variant="outline" className="h-10">
                          Try Again
                        </Button>
                      </div>
                    ) : isResearching ? (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 mb-4">
                          <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Deep Research in Progress</h3>
                        <p className="text-[14px] text-muted-foreground max-w-sm mx-auto">
                          This may take several minutes. Gemini is conducting comprehensive research on your thesis.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground/5 mb-4">
                          <Brain className="w-7 h-7 text-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Ready to Research</h3>
                        <p className="text-[14px] text-muted-foreground mb-6 max-w-sm mx-auto">
                          Gemini Deep Research will analyze your thesis and provide a comprehensive investment report.
                        </p>
                        <Button onClick={startResearch} className="h-10">
                          Start Deep Research
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <article className="report-content prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-[15px] prose-p:leading-relaxed prose-li:text-[15px]">
                    <ReactMarkdown>{researchReport}</ReactMarkdown>
                  </article>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Council Tab */}
          <TabsContent value="council" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto px-6 py-8">
                {!researchReport ? (
                  <div className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground/5 mb-4">
                      <AlertCircle className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-[14px] text-muted-foreground">Complete research first to convene the council.</p>
                  </div>
                ) : councilAnalyses.length === 0 && !isCouncilRunning ? (
                  <div className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 mb-4">
                      <Users className="w-7 h-7 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Convene Investment Council</h3>
                    <p className="text-[14px] text-muted-foreground mb-6 max-w-sm mx-auto">
                      The council will critique and debate the research findings from multiple perspectives.
                    </p>
                    <Button onClick={startCouncil} className="h-10">
                      Start Council Analysis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">Council Analyses</h3>
                      <div className="space-y-4">
                        {councilAnalyses.map((analysis: any, i: number) => (
                          <div key={i} className="bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                              <Badge variant="secondary" className="text-[11px] font-medium">{analysis.role}</Badge>
                              <span className="text-[12px] text-muted-foreground">
                                {analysis.agent === 'chatgpt' ? 'ChatGPT' : analysis.agent === 'claude' ? 'Claude' : 'Gemini'}
                              </span>
                            </div>
                            <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert">
                              <ReactMarkdown>{analysis.analysis}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                        {isCouncilRunning && (
                          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[13px]">Council analyzing...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {councilDebate.length > 0 && (
                      <div>
                        <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">Council Debate</h3>
                        <div className="space-y-4">
                          {councilDebate.map((round: any, i: number) => (
                            <div key={i} className="bg-card border border-border rounded-xl p-5">
                              <Badge variant="outline" className="mb-4 text-[11px]">Round {round.round}</Badge>
                              <div className="space-y-4">
                                {round.messages.map((msg: any, j: number) => (
                                  <div key={j} className="border-l-2 border-border pl-4">
                                    <p className="text-[13px] font-medium capitalize mb-1">{msg.agent}</p>
                                    <p className="text-[13px] text-muted-foreground">{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Deliberation Tab */}
          <TabsContent value="deliberation" className="flex-1 overflow-hidden m-0 p-0">
            <ChatInterface
              sessionId={session.id}
              initialMessages={initialMessages}
              researchReport={researchReport}
              disabled={status === 'researching'}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Verdict Footer */}
      {verdict && (
        <div className="border-t border-border px-6 py-3 bg-muted/30">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Badge variant={verdict === 'invest' ? 'default' : verdict === 'pass' ? 'destructive' : 'secondary'}>
              {verdict === 'invest' ? 'Invest' : verdict === 'pass' ? 'Pass' : verdict === 'watch' ? 'Watch' : 'More Research'}
            </Badge>
            {session.confidence_level && (
              <span className="text-[13px] text-muted-foreground">
                Confidence: {session.confidence_level}
              </span>
            )}
            {session.verdict_note && (
              <span className="text-[13px] text-muted-foreground">• {session.verdict_note}</span>
            )}
          </div>
        </div>
      )}

      {/* Verdict Form */}
      {status === 'deliberation' && !verdict && (
        <div className="border-t border-border px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <VerdictForm sessionId={session.id} onVerdictSet={setVerdict} />
          </div>
        </div>
      )}
    </div>
  );
}
