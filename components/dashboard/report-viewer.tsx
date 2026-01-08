'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateDealStatus } from '@/lib/actions/deals';
import type { DealMemo } from '@/types/deals';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface ReportViewerProps {
  deal: DealMemo;
}

export function ReportViewer({ deal }: ReportViewerProps) {
  const router = useRouter();
  const [isConveningCouncil, setIsConveningCouncil] = useState(false);

  const handleConveneCouncil = async () => {
    if (!deal.council_enabled) {
      toast.error('Council critique is not enabled for this deal');
      return;
    }

    setIsConveningCouncil(true);
    
    try {
      // Call council API
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id }),
      });

      if (response.ok) {
        toast.success('Council convened successfully');
        await updateDealStatus(deal.id, 'interrogation');
        router.refresh();
      } else {
        toast.error('Failed to convene council');
      }
    } catch (error) {
      console.error('Error convening council:', error);
      toast.error('An error occurred');
    } finally {
      setIsConveningCouncil(false);
    }
  };

  if (!deal.research_report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Research In Progress</h3>
            <p className="text-sm text-muted-foreground">
              {deal.status === 'researching' 
                ? 'The Gemini Deep Research agent is analyzing your thesis. This may take several minutes.'
                : 'No research report available yet. Commission research from the Scout tab.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto p-8">
          {/* Report Content */}
          <article className="report-content prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-3xl font-bold mb-6 mt-8 border-b pb-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-semibold mb-4 mt-6">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-medium mb-3 mt-4">{children}</h3>,
                p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 ml-6 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="mb-2">{children}</li>,
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto">
                    <table className="data-table min-w-full border-collapse border border-border">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-4 py-2">
                    {children}
                  </td>
                ),
                code: ({ className, children }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <code className="block bg-muted p-4 rounded-md overflow-x-auto font-mono text-sm">
                      {children}
                    </code>
                  ) : (
                    <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm">
                      {children}
                    </code>
                  );
                },
              }}
            >
              {deal.research_report}
            </ReactMarkdown>
          </article>
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      {deal.council_enabled && deal.status === 'council_review' && !deal.critiques && (
        <div className="absolute bottom-8 right-8">
          <Button
            size="lg"
            onClick={handleConveneCouncil}
            disabled={isConveningCouncil}
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            {isConveningCouncil ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Convening Council...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                Convene Council
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
