'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, FileText, MessageSquare, Users, CheckCircle2, AlertCircle, ArrowRight, Brain,
  TrendingUp, TrendingDown, ShieldAlert, Sparkles, AlertTriangle, ChevronDown, X, Search, FlaskConical
} from 'lucide-react';
import { FormattedMarkdown } from './formatted-markdown';
import { VerdictForm } from './verdict-form';
import { useTextSelection } from './use-text-selection';
import { TextSelectionAsk } from './text-selection-ask';
import { PopupChat } from './popup-chat';
import type { ResearchSession, ResearchOpportunity } from '@/src/lib/actions/research';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isTestModeClient } from '@/lib/test-mode/mock-research-data';

// Strategy configuration for display
const STRATEGY_DISPLAY: Record<string, { 
  icon: React.ReactNode; 
  label: string;
  color: string;
}> = {
  'value': {
    icon: <TrendingUp className="w-3 h-3" />,
    label: 'Value',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  'special-sits': {
    icon: <Sparkles className="w-3 h-3" />,
    label: 'Special Sits',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  'distressed': {
    icon: <AlertTriangle className="w-3 h-3" />,
    label: 'Distressed',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
  'general': {
    icon: <Search className="w-3 h-3" />,
    label: 'General',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
};

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
  const [hasStartedResearching, setHasStartedResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isCouncilRunning, setIsCouncilRunning] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Popup chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');

  // Handle chat open/close - reset prompt when closing
  const handleChatOpenChange = (open: boolean) => {
    setIsChatOpen(open);
    if (!open) {
      // Clear the initial prompt when chat is closed
      setInitialPrompt('');
    }
  };

  // Text selection hook for research tab
  const textSelection = useTextSelection((selectedText) => {
    setInitialPrompt(selectedText);
    setIsChatOpen(true);
  });

  // Thesis-based workflow state
  const [opportunities, setOpportunities] = useState<ResearchOpportunity[]>([]);
  const [discoveredOpportunities, setDiscoveredOpportunities] = useState<any[]>(session.discovered_opportunities || []);
  const [finalVerdict, setFinalVerdict] = useState<any>(session.final_verdict);

  // Get strategy from session (defaults to 'general')
  const strategy = (session as any).strategy || 'general';

  // Check if this is a thesis-based session (has discovered_opportunities)
  const isThesisBased = session.status === 'pending' || session.status === 'discovering' ||
                        session.status === 'researching' || session.status === 'analyzing' ||
                        discoveredOpportunities.length > 0;

  // Track if we've already auto-started to prevent double execution
  const hasAutoStarted = useRef(false);

  // Auto-start research for specialized strategies (not general)
  useEffect(() => {
    // Auto-start if:
    // 1. Session is pending
    // 2. No research report exists
    // 3. Not already researching
    // 4. Haven't already auto-started
    // 5. This is a specialized strategy (not general)
    const shouldAutoStart = 
      session.status === 'pending' && 
      !session.research_report && 
      !isResearching && 
      !hasAutoStarted.current &&
      strategy !== 'general';

    if (shouldAutoStart) {
      hasAutoStarted.current = true;
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        startResearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session.status, session.research_report, strategy]);

  const startResearch = async () => {
    setIsResearching(true);
    setResearchError(null);
    setHasStartedResearching(false);
    setCurrentPhase(null);
    setCurrentMessage(null);

    try {
      // Use thesis-based workflow endpoint
      const response = await fetch('/api/research/thesis-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to start research');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasReceivedData = false;

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

              // Only show researching status after receiving first data from API
              if (!hasReceivedData) {
                hasReceivedData = true;
                setHasStartedResearching(true);
              }

              // Handle different event types
              if (data.type === 'status') {
                setStatus(data.stage === 'discovering' ? 'discovering' :
                       data.stage === 'discovered' ? 'researching' :
                       data.stage === 'researching' ? 'researching' :
                       data.stage === 'analyzing' ? 'analyzing' : status);
                setCurrentPhase(data.stage);
                setCurrentMessage(data.message);
              } else if (data.type === 'progress') {
                setCurrentPhase(`analyzing-${data.ticker}`);
                setCurrentMessage(`${data.stage}: ${data.ticker} (${data.current}/${data.total})`);
              } else if (data.type === 'verdict') {
                setFinalVerdict(data);
                setStatus('deliberation');
              } else if (data.type === 'complete') {
                setStatus('deliberation');
                setCurrentPhase(null);
                setCurrentMessage(null);
                toast.success('Research Complete', { description: `Analyzed ${data.summary?.totalAnalyzed || 0} opportunities` });
                router.refresh();
              } else if (data.type === 'error') {
                const errorMsg = data.message || 'Research failed';
                setResearchError(errorMsg);
                toast.error('Research Failed', { description: errorMsg });
                setIsResearching(false);
                setHasStartedResearching(false);
                setCurrentPhase(null);
                setCurrentMessage(null);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Research error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete research';
      setResearchError(errorMsg);
      toast.error('Research Error', { description: errorMsg });
      setIsResearching(false);
      setHasStartedResearching(false);
      setCurrentPhase(null);
      setCurrentMessage(null);
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
        const error = await response.text();
        throw new Error(error || 'Failed to start council analysis');
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
                const errorMsg = data.content || 'Council analysis failed';
                toast.error('Council Error', { description: errorMsg });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Council error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete council analysis';
      toast.error('Council Error', { description: errorMsg });
    } finally {
      setIsCouncilRunning(false);
    }
  };

  const handleDeleteSession = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/research/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) throw new Error('Failed to delete session');

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusConfig = () => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'Ready', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400', icon: <FileText className="w-3 h-3" /> },
      discovering: { label: 'Discovering', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Search className="w-3 h-3 animate-pulse" /> },
      researching: { label: 'Researching', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      analyzing: { label: 'Analyzing', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Brain className="w-3 h-3 animate-pulse" /> },
      council_gather: { label: 'Council Ready', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Users className="w-3 h-3" /> },
      council_debate: { label: 'Debating', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      deliberation: { label: 'Deliberation', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <MessageSquare className="w-3 h-3" /> },
      finalized: { label: 'Finalized', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    };
    // Don't show researching badge unless API has actually started responding
    if ((status === 'researching' || status === 'discovering' || status === 'analyzing') && !hasStartedResearching) {
      return configs.pending;
    }
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig();

  const strategyDisplay = STRATEGY_DISPLAY[strategy] || STRATEGY_DISPLAY.general;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h1 className="text-[15px] font-medium truncate">{session.title}</h1>
          {/* Strategy Badge */}
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border", strategyDisplay.color)}>
            {strategyDisplay.icon}
            <span>{strategyDisplay.label}</span>
          </div>
          {/* Status Badge */}
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium", statusConfig.color)}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
          {/* Test Mode Badge */}
          {isTestModeClient() && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              <FlaskConical className="w-3 h-3" />
              <span>Test Mode</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </header>

      {/* Content */}
      <div 
        className="flex-1 overflow-hidden"
        ref={textSelection.containerRef}
        onMouseUp={textSelection.handleMouseUp}
      >
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
            </TabsList>
          </div>

          {/* Research Tab */}
          <TabsContent value="research" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div
                className="max-w-3xl mx-auto px-6 py-8"
              >
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
                        <h3 className="text-lg font-medium mb-2">
                          {currentPhase === 'discovering' ? 'Discovering Opportunities' :
                           currentPhase === 'researching' ? 'Researching Opportunities' :
                           currentPhase?.startsWith('analyzing') ? 'Analyzing Opportunities' :
                           'Investment Research in Progress'}
                        </h3>
                        <p className="text-[14px] text-muted-foreground max-w-sm mx-auto mb-4">
                          {currentPhase === 'discovering' && 'Finding investment opportunities that match your thesis...'}
                          {currentPhase === 'researching' && 'Running deep research on discovered opportunities...'}
                          {currentPhase?.startsWith('analyzing') && 'Running strategy and critique analysis on each opportunity...'}
                          {!currentPhase && 'This may take several minutes. Running comprehensive research on your thesis.'}
                        </p>
                        {/* Phase indicator */}
                        {currentPhase && (
                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-[13px]">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-muted-foreground">
                              {currentPhase === 'discovering' && 'Discovering opportunities from thesis...'}
                              {currentPhase === 'researching' && 'Researching each opportunity...'}
                              {currentPhase?.startsWith('analyzing') && currentMessage && currentMessage}
                              {!currentMessage && currentPhase && currentPhase}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground/5 mb-4">
                          <Brain className="w-7 h-7 text-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Ready to Research</h3>
                        <p className="text-[14px] text-muted-foreground mb-2 max-w-sm mx-auto">
                          Our AI will discover specific investment opportunities matching your thesis, research each one, and provide investment recommendations.
                        </p>
                        <p className="text-[12px] text-muted-foreground/70 mb-6 max-w-sm mx-auto">
                          Discover Opportunities → Research Each → Strategy Analysis → Critiques → Final Verdict
                        </p>
                        <Button onClick={startResearch} className="h-10">
                          Start Investment Research
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
        </Tabs>
      </div>

      {/* Verdict Footer */}
      {finalVerdict ? (
        <div className="border-t border-border px-6 py-3 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant={finalVerdict.decision === 'invest' ? 'default' : finalVerdict.decision === 'pass' ? 'destructive' : 'secondary'}>
                {finalVerdict.decision === 'invest' ? 'Invest' : finalVerdict.decision === 'pass' ? 'Pass' : 'Watch'}
              </Badge>
              {finalVerdict.confidence && (
                <span className="text-[13px] text-muted-foreground">
                  {finalVerdict.confidence}% conviction
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">
              <span className="font-medium">Top Pick:</span> {finalVerdict.topPick}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">{finalVerdict.rationale}</p>
          </div>
        </div>
      ) : verdict && (
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
      {status === 'deliberation' && !verdict && !finalVerdict && (
        <div className="border-t border-border px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <VerdictForm sessionId={session.id} onVerdictSet={setVerdict} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{session.title}"? This action cannot be undone and will permanently remove the session and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Text Selection Ask Popup */}
      <TextSelectionAsk
        show={textSelection.showAskButton}
        position={textSelection.position}
        onAsk={textSelection.handleAsk}
        onClose={textSelection.hideAskButton}
      />

      {/* Floating Chat Button - shows when research is complete */}
      {researchReport && !isChatOpen && (
        <Button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-40"
          size="icon"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      )}

      {/* Popup Chat */}
      <PopupChat
        open={isChatOpen}
        onOpenChange={handleChatOpenChange}
        sessionId={session.id}
        initialMessages={initialMessages}
        researchReport={researchReport}
        disabled={status === 'researching'}
        initialPrompt={initialPrompt}
        onClearInitialPrompt={() => setInitialPrompt('')}
      />
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
