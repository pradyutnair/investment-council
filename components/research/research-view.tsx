'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingUp, TrendingDown, ShieldAlert, Sparkles, AlertTriangle, ChevronDown, X, Search, ArrowLeft
} from 'lucide-react';
import { FormattedMarkdown } from './formatted-markdown';
import { PopupChat } from './popup-chat';
import type { ResearchSession } from '@/src/lib/actions/research';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STRATEGY_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  'value': { icon: <TrendingUp className="w-3 h-3" />, label: 'Value', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  'special-sits': { icon: <Sparkles className="w-3 h-3" />, label: 'Special Sits', color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
  'distressed': { icon: <AlertTriangle className="w-3 h-3" />, label: 'Distressed', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
  'general': { icon: <Search className="w-3 h-3" />, label: 'Custom', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
};

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
  'value': { icon: <TrendingUp className="w-5 h-5" />, label: 'Value Investor', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  'skeptic': { icon: <TrendingDown className="w-5 h-5" />, label: 'Skeptic', color: 'text-red-600', bgColor: 'bg-red-500/10 border-red-500/20' },
  'risk officer': { icon: <ShieldAlert className="w-5 h-5" />, label: 'Risk Officer', color: 'text-amber-600', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  'special situations': { icon: <Sparkles className="w-5 h-5" />, label: 'Special Sits', color: 'text-purple-600', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  'distressed': { icon: <AlertTriangle className="w-5 h-5" />, label: 'Distressed', color: 'text-orange-600', bgColor: 'bg-orange-500/10 border-orange-500/20' },
};

function getRoleConfig(role: string | undefined | null) {
  if (!role) return { icon: <Users className="w-5 h-5" />, label: 'Analyst', color: 'text-blue-600', bgColor: 'bg-blue-500/10 border-blue-500/20' };
  return ROLE_CONFIG[role.toLowerCase()] || { icon: <Users className="w-5 h-5" />, label: role, color: 'text-blue-600', bgColor: 'bg-blue-500/10 border-blue-500/20' };
}

interface ResearchViewProps {
  session: ResearchSession;
  initialMessages?: any[];
}

export function ResearchView({ session, initialMessages = [] }: ResearchViewProps) {
  const router = useRouter();
  const [report, setReport] = useState(session.research_report);
  const [councilAnalyses, setCouncilAnalyses] = useState(session.council_analyses || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isCouncilRunning, setIsCouncilRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const hasAutoStarted = useRef(false);

  const strategy = session.strategy || 'general';
  const strategyConfig = STRATEGY_CONFIG[strategy] || STRATEGY_CONFIG.general;

  // Sync with session updates
  useEffect(() => {
    setReport(session.research_report);
    setCouncilAnalyses(session.council_analyses || []);
  }, [session]);

  // Auto-start research for non-general strategies
  useEffect(() => {
    if (session.status === 'pending' && !session.research_report && !isLoading && !hasAutoStarted.current && strategy !== 'general') {
      hasAutoStarted.current = true;
      setTimeout(startResearch, 300);
    }
  }, [session.status, session.research_report, strategy]);

  const startResearch = async () => {
    setIsLoading(true);
    setError(null);
    setProgress('Initializing...');

    const response = await fetch('/api/research/thesis-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });

    if (!response.ok) {
      setError('Failed to start research');
      setIsLoading(false);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'progress' || data.type === 'status') {
            setProgress(data.message);
          } else if (data.type === 'complete') {
            toast.success('Research complete!');
            router.refresh();
          } else if (data.type === 'error') {
            setError(data.message);
            toast.error('Research failed');
          }
        }
      }
    }
    setIsLoading(false);
  };

  const startCouncil = async () => {
    setIsCouncilRunning(true);

    const response = await fetch('/api/council/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });

    if (!response.ok) {
      toast.error('Failed to start council');
      setIsCouncilRunning(false);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'analysis') {
            setCouncilAnalyses(prev => [...prev, { agent: data.agent, role: data.role, analysis: data.content }]);
          } else if (data.type === 'complete') {
            toast.success('Council debate complete!');
            router.refresh();
          } else if (data.type === 'error') {
            toast.error('Council failed');
          }
        }
      }
    }
    setIsCouncilRunning(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await fetch('/api/research/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-medium truncate max-w-[300px]">{session.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={cn("text-xs gap-1", strategyConfig.color)}>
                {strategyConfig.icon}
                {strategyConfig.label}
              </Badge>
              {report && (
                <Badge variant="outline" className="text-xs gap-1 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Research Done
                </Badge>
              )}
              {councilAnalyses.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1 text-purple-600 bg-purple-500/10 border-purple-500/20">
                  <Users className="w-3 h-3" />
                  Council Done
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowDelete(true)}>
          <X className="w-4 h-4" />
        </Button>
      </header>

      {/* Content with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="research" className="h-full flex flex-col">
          <div className="px-4 border-b shrink-0">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              <TabsTrigger value="research" className="h-10 px-0 data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-foreground rounded-none text-sm">
                <FileText className="w-4 h-4 mr-2" />
                Research
                {report && <CheckCircle2 className="w-3 h-3 ml-2 text-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger value="council" className="h-10 px-0 data-[state=active]:shadow-none data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-foreground rounded-none text-sm" disabled={!report}>
                <Users className="w-4 h-4 mr-2" />
                Council
                {councilAnalyses.length > 0 && <CheckCircle2 className="w-3 h-3 ml-2 text-emerald-500" />}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Research Tab */}
          <TabsContent value="research" className="flex-1 overflow-hidden m-0">
            {!report ? (
              <div className="h-full flex items-center justify-center p-8">
                {error ? (
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">Research Failed</h2>
                    <p className="text-muted-foreground text-sm mb-4">{error}</p>
                    <Button onClick={startResearch}>Try Again</Button>
                  </div>
                ) : isLoading ? (
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">Researching...</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      Gemini is analyzing investment opportunities. This takes 5-10 minutes.
                    </p>
                    <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm text-muted-foreground">
                      {progress}
                    </div>
                  </div>
                ) : (
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">Ready to Research</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      Click below to start AI-powered research on your investment thesis.
                    </p>
                    <Button onClick={startResearch}>
                      Start Research <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea className="h-full">
                <article className="max-w-4xl mx-auto px-6 py-8">
                  <FormattedMarkdown content={report} />
                </article>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Council Tab */}
          <TabsContent value="council" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="max-w-3xl mx-auto px-6 py-8">
                {councilAnalyses.length === 0 && !isCouncilRunning ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">Convene Investment Council</h2>
                    <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
                      Let the council debate the research findings. Different agents will challenge and scrutinize the investment thesis.
                    </p>
                    <Button onClick={startCouncil}>
                      Start Council Debate <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Council Analyses</h3>
                    {councilAnalyses.map((analysis: any, i: number) => {
                      const roleConfig = getRoleConfig(analysis.role);
                      const displayLabel = analysis.agent ? `${analysis.agent} • ${roleConfig.label}` : roleConfig.label;
                      return (
                        <Collapsible key={i} defaultOpen={i === 0}>
                          <CollapsibleTrigger className="w-full">
                            <div className={cn("flex items-center justify-between p-4 rounded-lg border", roleConfig.bgColor)}>
                              <div className="flex items-center gap-3">
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-white/50 dark:bg-black/20", roleConfig.color)}>
                                  {roleConfig.icon}
                                </div>
                                <div className="text-left">
                                  <p className={cn("font-semibold", roleConfig.color)}>{displayLabel}</p>
                                </div>
                              </div>
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 p-4 bg-card border rounded-lg">
                              <FormattedMarkdown content={analysis.analysis} />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                    {isCouncilRunning && (
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Council analyzing...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Chat Button */}
      {report && !isChatOpen && (
        <Button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-40"
          size="icon"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      )}

      {/* Chat Popup */}
      <PopupChat
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        sessionId={session.id}
        initialMessages={initialMessages}
        researchReport={report}
        disabled={isLoading}
      />

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this research?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{session.title}" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
