'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, TrendingUp, Sparkles, AlertTriangle, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ResearchStrategy } from '@/src/types/research';

interface StrategyOption {
  id: ResearchStrategy;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  examples: string[];
}

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'value',
    name: 'Value Investing',
    description: 'Graham & Greenwald approach. Margin of safety, intrinsic value focus.',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
    examples: ['Deep value in shipping sector', 'P/B < 1 opportunities', 'Hidden asset plays'],
  },
  {
    id: 'special-sits',
    name: 'Special Situations',
    description: 'Greenblatt style event-driven. Spinoffs, mergers, restructuring.',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20',
    examples: ['Recent spinoff opportunities', 'Merger arbitrage plays', 'Corporate restructuring'],
  },
  {
    id: 'distressed',
    name: 'Distressed',
    description: 'Howard Marks approach. Contrarian, cycle-aware, turnaround focus.',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
    examples: ['Beaten-down sectors', 'Turnaround candidates', 'Distressed debt plays'],
  },
  {
    id: 'general',
    name: 'General Research',
    description: 'Comprehensive analysis without a specific strategy lens.',
    icon: <Search className="w-5 h-5" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
    examples: ['Exploratory research', 'Industry analysis', 'Competitive dynamics'],
  },
];

export function ThesisForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [thesis, setThesis] = useState('');
  const [strategy, setStrategy] = useState<ResearchStrategy>('general');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!thesis.trim()) {
      toast.error('Please enter your investment thesis');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/research/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || thesis.substring(0, 100) + '...',
          thesis,
          strategy,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create research session');
      }

      const { sessionId } = await response.json();
      router.push(`/dashboard/research/${sessionId}?strategy=${strategy}`);
    } catch (error) {
      console.error('Error creating research session:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStrategy = STRATEGY_OPTIONS.find(s => s.id === strategy);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Strategy Selection */}
      <div className="space-y-3">
        <Label className="text-[13px] font-medium">
          Research Strategy
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {STRATEGY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setStrategy(option.id)}
              className={cn(
                'relative flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left',
                strategy === option.id
                  ? `${option.bgColor} border-current ${option.color}`
                  : 'border-border hover:border-muted-foreground/50 bg-background'
              )}
            >
              <div className={cn('flex items-center gap-2 mb-1', option.color)}>
                {option.icon}
                <span className="font-medium text-[13px]">{option.name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {option.description}
              </p>
              {strategy === option.id && (
                <div className={cn('absolute top-2 right-2', option.color)}>
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>
        {selectedStrategy && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">Example queries:</span>{' '}
            {selectedStrategy.examples.join(' • ')}
          </p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-[13px] font-medium">
          Title <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Spinoff opportunity in industrial sector"
          className="h-10"
        />
      </div>

      {/* Thesis */}
      <div className="space-y-2">
        <Label htmlFor="thesis" className="text-[13px] font-medium">
          Investment Thesis
        </Label>
        <Textarea
          id="thesis"
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          placeholder={`Describe your investment hypothesis...

${selectedStrategy?.examples.map(e => `• ${e}`).join('\n') || 'Examples:\n• Research special situation opportunities\n• Analyze deep value plays\n• Investigate catalyst-driven opportunities'}`}
          rows={6}
          className="resize-none text-[14px] leading-relaxed"
          required
        />
        <p className="text-[12px] text-muted-foreground">
          The {selectedStrategy?.name || 'research'} agent will analyze this from its specialized perspective, 
          then the council (Skeptic + Risk Officer) will critique the findings.
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'w-full h-11 text-[14px] font-medium transition-colors',
          strategy !== 'general' && selectedStrategy?.color
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Session...
          </>
        ) : (
          <>
            Start {selectedStrategy?.name || 'Research'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
