'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DealMemo } from '@/types/deals';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Shield } from 'lucide-react';

interface CouncilSplitViewProps {
  deal: DealMemo;
}

export function CouncilSplitView({ deal }: CouncilSplitViewProps) {
  if (!deal.critiques) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Council Not Convened</h3>
            <p className="text-sm text-muted-foreground">
              The council critique has not been generated yet. Convene the council from the Report tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Pane: Original Report */}
      <div className="w-1/2 border-r border-border/40">
        <div className="h-full flex flex-col">
          <div className="border-b border-border/40 px-6 py-3">
            <h3 className="font-semibold">Original Research Report</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6">
              <article className="report-content prose prose-sm prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown>{deal.research_report || ''}</ReactMarkdown>
              </article>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right Pane: Critique Cards */}
      <div className="w-1/2">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* The Skeptic (ChatGPT) */}
            {deal.critiques.skeptic && (
              <Card className="border-amber-500/30 bg-amber-50/10 dark:bg-amber-950/10">
                <CardHeader className="border-b border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-amber-900 dark:text-amber-100">
                        The Skeptic
                      </CardTitle>
                      <CardDescription className="text-amber-700 dark:text-amber-300">
                        Counter-arguments • Short Seller Perspective
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
                    <ReactMarkdown>{deal.critiques.skeptic.content}</ReactMarkdown>
                  </div>
                  {deal.critiques.skeptic.timestamp && (
                    <div className="mt-4 pt-4 border-t border-amber-500/20">
                      <Badge variant="outline" className="text-xs border-amber-500/30">
                        Generated {new Date(deal.critiques.skeptic.timestamp).toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* The Risk Officer (Claude) */}
            {deal.critiques.risk_officer && (
              <Card className="border-red-500/30 bg-red-50/10 dark:bg-red-950/10">
                <CardHeader className="border-b border-red-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <CardTitle className="text-red-900 dark:text-red-100">
                        The Risk Officer
                      </CardTitle>
                      <CardDescription className="text-red-700 dark:text-red-300">
                        Risk Analysis • Regulatory Concerns
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
                    <ReactMarkdown>{deal.critiques.risk_officer.content}</ReactMarkdown>
                  </div>
                  {deal.critiques.risk_officer.timestamp && (
                    <div className="mt-4 pt-4 border-t border-red-500/20">
                      <Badge variant="outline" className="text-xs border-red-500/30">
                        Generated {new Date(deal.critiques.risk_officer.timestamp).toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
