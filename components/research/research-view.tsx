'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, FileText, MessageSquare, Users, CheckCircle2, AlertCircle, ArrowRight, Brain,
  TrendingUp, TrendingDown, ShieldAlert, Sparkles, AlertTriangle, ChevronDown
} from 'lucide-react';
import { ChatInterface } from './chat-interface';
import { FormattedMarkdown } from './formatted-markdown';
import { VerdictForm } from './verdict-form';
import type { ResearchSession } from '@/lib/actions/research';
import { cn } from '@/lib/utils';

// Role configuration with icons, colors, and descriptions
const ROLE_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  'bull': {
    icon: <TrendingUp className="w-5 h-5" />,
    label: 'Bull Case',
    description: 'Advocates for the investment opportunity',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  'value': {
    icon: <TrendingUp className="w-5 h-5" />,
    label: 'Value Investor',
    description: 'Focuses on intrinsic value and margin of safety',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  'skeptic': {
    icon: <TrendingDown className="w-5 h-5" />,
    label: 'Skeptic',
    description: 'Challenges assumptions and highlights risks',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
  },
  'bear': {
    icon: <TrendingDown className="w-5 h-5" />,
    label: 'Bear Case',
    description: 'Argues against the investment',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
  },
  'risk': {
    icon: <ShieldAlert className="w-5 h-5" />,
    label: 'Risk Officer',
    description: 'Evaluates downside scenarios and risk factors',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  'risk officer': {
    icon: <ShieldAlert className="w-5 h-5" />,
    label: 'Risk Officer',
    description: 'Evaluates downside scenarios and risk factors',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  'special situations': {
    icon: <Sparkles className="w-5 h-5" />,
    label: 'Special Situations',
    description: 'Analyzes event-driven opportunities',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
  },
  'distressed': {
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'Distressed Analyst',
    description: 'Specializes in distressed and turnaround situations',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
  },
};

function getRoleConfig(role: string | undefined | null) {
  if (!role) {
    return {
      icon: <Users className="w-5 h-5" />,
      label: 'Analyst',
      description: 'Council member',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    };
  }
  const normalizedRole = role.toLowerCase();
  return ROLE_CONFIG[normalizedRole] || {
    icon: <Users className="w-5 h-5" />,
    label: role,
    description: 'Council member',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  };
}

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
                  <article>
                    <FormattedMarkdown content={researchReport} />
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
                      <div className="space-y-3">
                        {councilAnalyses.map((analysis: any, i: number) => {
                          const roleConfig = getRoleConfig(analysis.role);
                          return (
                            <CouncilAnalysisCard 
                              key={i} 
                              analysis={analysis} 
                              roleConfig={roleConfig}
                              defaultOpen={i === 0}
                            />
                          );
                        })}
                        {isCouncilRunning && (
                          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-[14px]">Council analyzing...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {councilDebate.length > 0 && (
                      <div>
                        <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-4">Council Debate</h3>
                        <div className="space-y-3">
                          {councilDebate.map((round: any, i: number) => (
                            <Collapsible key={i} defaultOpen={i === 0}>
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-[14px] font-medium">Debate Round {round.round}</p>
                                      <p className="text-[12px] text-muted-foreground">{round.messages?.length || 0} exchanges</p>
                                    </div>
                                  </div>
                                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 p-4 bg-card border border-border rounded-xl space-y-4">
                                  {round.messages?.map((msg: any, j: number) => {
                                    const msgRoleConfig = getRoleConfig(msg.agent || msg.role || 'analyst');
                                    return (
                                      <div key={j} className={cn("border-l-2 pl-4", msgRoleConfig.color.replace('text-', 'border-'))}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={cn("w-4 h-4", msgRoleConfig.color)}>{msgRoleConfig.icon}</span>
                                          <p className={cn("text-[13px] font-medium", msgRoleConfig.color)}>{msgRoleConfig.label}</p>
                                        </div>
                                        <div className="text-sm">
                                          <FormattedMarkdown content={msg.content || ''} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
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

// Collapsible card component for each council analysis
function CouncilAnalysisCard({ 
  analysis, 
  roleConfig, 
  defaultOpen 
}: { 
  analysis: any; 
  roleConfig: ReturnType<typeof getRoleConfig>;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const agentName = analysis.agent === 'chatgpt' ? 'GPT-4' : 
                    analysis.agent === 'claude' ? 'Claude' : 
                    analysis.agent === 'gemini' ? 'Gemini' : 
                    analysis.agent || 'AI';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full group">
        <div className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
          roleConfig.bgColor,
          "hover:brightness-95 dark:hover:brightness-110"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              roleConfig.color,
              "bg-white/50 dark:bg-black/20"
            )}>
              {roleConfig.icon}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className={cn("text-[15px] font-semibold", roleConfig.color)}>
                  {roleConfig.label}
                </p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-background/50">
                  {agentName}
                </Badge>
              </div>
              <p className="text-[12px] text-muted-foreground">{roleConfig.description}</p>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-5 bg-card border border-border rounded-xl">
          <FormattedMarkdown content={analysis.analysis} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
