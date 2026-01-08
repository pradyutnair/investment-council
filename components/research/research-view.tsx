'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, MessageSquare, Gavel, CheckCircle2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatInterface } from './chat-interface';
import { VerdictForm } from './verdict-form';
import type { ResearchSession } from '@/lib/actions/research';

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

  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  // Council state
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

      if (!response.ok) {
        throw new Error('Failed to start research');
      }

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
            } catch (e) {
              // Skip invalid JSON
            }
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

      if (!response.ok) {
        throw new Error('Failed to start council analysis');
      }

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
              } else if (data.type === 'error') {
                console.error('Council error:', data.message);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Council error:', error);
    } finally {
      setIsCouncilRunning(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" /> Ready</Badge>;
      case 'researching':
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Researching</Badge>;
      case 'council_gather':
      case 'council_debate':
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Council Analyzing</Badge>;
      case 'deliberation':
        return <Badge variant="secondary"><MessageSquare className="w-3 h-3 mr-1" /> Deliberation</Badge>;
      case 'finalized':
        return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" /> Finalized</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold">{session.title}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{session.thesis}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="research" className="h-full flex flex-col">
          <div className="border-b border-border px-4">
            <TabsList className="h-12">
              <TabsTrigger value="research" className="gap-2">
                <FileText className="w-4 h-4" />
                Research
                {researchReport && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="council" className="gap-2" disabled={!researchReport}>
                <Gavel className="w-4 h-4" />
                Council
                {status === 'finalized' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="deliberation" className="gap-2" disabled={status === 'pending' || status === 'researching'}>
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Research Tab */}
          <TabsContent value="research" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto">
                {!researchReport ? (
                  <div className="space-y-4">
                    {researchError ? (
                      <Card className="p-8 text-center border-destructive">
                        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                        <div>
                          <h3 className="font-semibold mb-2">Research Failed</h3>
                          <p className="text-sm text-muted-foreground mb-4">{researchError}</p>
                          <Button onClick={startResearch} size="lg" variant="outline">
                            Try Again
                          </Button>
                        </div>
                      </Card>
                    ) : isResearching ? (
                      <Card className="p-8 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-12 h-12 animate-spin text-primary" />
                          <div>
                            <h3 className="font-semibold mb-2">Deep Research in Progress</h3>
                            <p className="text-sm text-muted-foreground">
                              This may take several minutes. The AI is conducting comprehensive research on your thesis.
                            </p>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-8 text-center">
                        <div className="space-y-4">
                          <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold mb-2">Ready to Start Research</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Gemini Deep Research will analyze your thesis and provide a comprehensive report.
                            </p>
                            <Button onClick={startResearch} size="lg">
                              Start Deep Research
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none dark:prose-invert">
                    <ReactMarkdown>{researchReport}</ReactMarkdown>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Council Tab */}
          <TabsContent value="council" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-6 max-w-4xl mx-auto">
                {!researchReport ? (
                  <Card className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Complete research first to convene the council.</p>
                  </Card>
                ) : councilAnalyses.length === 0 && !isCouncilRunning ? (
                  <Card className="p-8 text-center">
                    <div className="space-y-4">
                      <Gavel className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold mb-2">Convene Investment Council</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          The council will critique and debate the research findings from multiple perspectives.
                        </p>
                        <Button onClick={startCouncil} size="lg">
                          Start Council Analysis
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Individual Analyses */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Council Analyses</h3>
                      <div className="space-y-4">
                        {councilAnalyses.map((analysis: any, i: number) => (
                          <Card key={i} className="p-6">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline">{analysis.role}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {analysis.agent === 'chatgpt' ? 'ChatGPT' : analysis.agent === 'claude' ? 'Claude' : 'Gemini'}
                              </span>
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>{analysis.analysis}</ReactMarkdown>
                            </div>
                          </Card>
                        ))}
                        {isCouncilRunning && (
                          <Card className="p-4">
                            <div className="flex items-center gap-3">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Council analyzing...</span>
                            </div>
                          </Card>
                        )}
                      </div>
                    </div>

                    {/* Debate */}
                    {councilDebate.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Council Debate</h3>
                          <div className="space-y-4">
                            {councilDebate.map((round: any, i: number) => (
                              <Card key={i} className="p-6">
                                <Badge variant="secondary" className="mb-3">Round {round.round}</Badge>
                                <div className="space-y-3">
                                  {round.messages.map((msg: any, j: number) => (
                                    <div key={j} className="border-l-2 border-border pl-3">
                                      <p className="text-sm font-medium capitalize">{msg.agent}</p>
                                      <p className="text-sm text-muted-foreground mt-1">{msg.content}</p>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </>
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
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant={verdict === 'invest' ? 'default' : verdict === 'pass' ? 'destructive' : 'secondary'}>
                  {verdict === 'invest' ? 'Invest' : verdict === 'pass' ? 'Pass' : verdict === 'watch' ? 'Watch' : 'Needs More Research'}
                </Badge>
                {session.confidence_level && (
                  <span className="text-sm text-muted-foreground ml-2">
                    Confidence: {session.confidence_level}
                  </span>
                )}
              </div>
              {session.verdict_note && (
                <p className="text-sm text-muted-foreground">{session.verdict_note}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verdict Form (when in deliberation) */}
      {status === 'deliberation' && !verdict && (
        <div className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
            <VerdictForm sessionId={session.id} onVerdictSet={setVerdict} />
          </div>
        </div>
      )}
    </div>
  );
}
