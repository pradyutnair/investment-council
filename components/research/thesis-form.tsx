'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Search,
  ChevronDown,
  Zap,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ResearchStrategy } from '@/src/types/research';

interface StrategyOption {
  id: ResearchStrategy;
  name: string;
  shortName: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  bgGradient: string;
  borderColor: string;
  defaultThesis: string;
  features: string[];
  requiresThesis: boolean;
}

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'value',
    name: 'Value Investing',
    shortName: 'Value',
    description: 'Benjamin Graham & Warren Buffett style. Finds undervalued stocks with margin of safety.',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    hoverColor: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
    bgGradient: 'from-emerald-500/20 to-emerald-500/5',
    borderColor: 'border-emerald-500/40',
    defaultThesis: 'Find a deep value stock trading significantly below intrinsic value with strong fundamentals, low P/E, low P/B, and a clear margin of safety.',
    features: ['P/B < 1.5 screening', 'Asset-based valuation', 'Margin of safety'],
    requiresThesis: false,
  },
  {
    id: 'special-sits',
    name: 'Special Situations',
    shortName: 'Special Sits',
    description: 'Joel Greenblatt style event-driven investing. Spinoffs, mergers, and restructurings.',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'text-purple-600 dark:text-purple-400',
    hoverColor: 'hover:border-purple-500/50 hover:bg-purple-500/5',
    bgGradient: 'from-purple-500/20 to-purple-500/5',
    borderColor: 'border-purple-500/40',
    defaultThesis: 'Find a special situation investment opportunity such as a spinoff, merger arbitrage, or restructuring with a clear catalyst and timeline.',
    features: ['Spinoff tracking', 'Merger arbitrage', 'Catalyst-driven'],
    requiresThesis: false,
  },
  {
    id: 'distressed',
    name: 'Distressed Investing',
    shortName: 'Distressed',
    description: 'Howard Marks & Oaktree style. Contrarian bets on turnarounds and cycle bottoms.',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'text-orange-600 dark:text-orange-400',
    hoverColor: 'hover:border-orange-500/50 hover:bg-orange-500/5',
    bgGradient: 'from-orange-500/20 to-orange-500/5',
    borderColor: 'border-orange-500/40',
    defaultThesis: 'Find a distressed investment opportunity - a stock that has fallen significantly but has strong underlying assets and a path to recovery.',
    features: ['Turnaround candidates', 'Contrarian plays', 'Cycle analysis'],
    requiresThesis: false,
  },
  {
    id: 'general',
    name: 'Custom Research',
    shortName: 'Custom',
    description: 'Deep research on your specific thesis or investment question.',
    icon: <Search className="w-6 h-6" />,
    color: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'hover:border-blue-500/50 hover:bg-blue-500/5',
    bgGradient: 'from-blue-500/20 to-blue-500/5',
    borderColor: 'border-blue-500/40',
    defaultThesis: '',
    features: ['Your thesis', 'Deep research', 'Full analysis'],
    requiresThesis: true,
  },
];

export function ThesisForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStrategy, setSubmittingStrategy] = useState<ResearchStrategy | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<ResearchStrategy | null>(null);
  const [title, setTitle] = useState('');
  const [thesis, setThesis] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);

  const handleQuickStart = async (strategy: ResearchStrategy) => {
    const option = STRATEGY_OPTIONS.find(s => s.id === strategy);
    if (!option) return;

    if (option.requiresThesis) {
      setSelectedStrategy(strategy);
      setShowCustomize(true);
      return;
    }

    setIsSubmitting(true);
    setSubmittingStrategy(strategy);

    const response = await fetch('/api/research/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${option.name} Discovery`,
        thesis: option.defaultThesis,
        strategy,
      }),
    });

    if (!response.ok) {
      toast.error('Failed to create research session');
      setIsSubmitting(false);
      setSubmittingStrategy(null);
      return;
    }

    const { sessionId } = await response.json();
    router.push(`/dashboard/research/${sessionId}`);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const option = STRATEGY_OPTIONS.find(s => s.id === selectedStrategy);
    if (!option) return;

    if (option.requiresThesis && !thesis.trim()) {
      toast.error('Please enter your investment thesis');
      return;
    }

    setIsSubmitting(true);
    setSubmittingStrategy(selectedStrategy);

    const finalThesis = thesis.trim() || option.defaultThesis;
    const finalTitle = title.trim() || `${option.name} Research`;

    const response = await fetch('/api/research/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: finalTitle,
        thesis: finalThesis,
        strategy: selectedStrategy,
      }),
    });

    if (!response.ok) {
      toast.error('Failed to create research session');
      setIsSubmitting(false);
      setSubmittingStrategy(null);
      return;
    }

    const { sessionId } = await response.json();
    router.push(`/dashboard/research/${sessionId}`);
  };

  const currentOption = selectedStrategy ? STRATEGY_OPTIONS.find(s => s.id === selectedStrategy) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Start New Research</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Choose a strategy and let the AI discover and analyze investment opportunities for you.
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STRATEGY_OPTIONS.map((option) => {
          const isLoading = isSubmitting && submittingStrategy === option.id;
          const isSelected = selectedStrategy === option.id;

          return (
            <div
              key={option.id}
              className={cn(
                'group relative rounded-lg border-2 bg-card transition-all duration-200',
                isSelected 
                  ? `${option.borderColor} bg-gradient-to-br ${option.bgGradient}` 
                  : `border-border ${option.hoverColor}`,
                isLoading && 'opacity-80'
              )}
            >
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-lg bg-gradient-to-br', option.bgGradient, option.color)}>
                      {option.icon}
                    </div>
                    <div>
                      <h3 className={cn('font-semibold text-base', option.color)}>{option.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.requiresThesis ? 'Requires your thesis' : 'Autonomous discovery'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">{option.description}</p>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {option.features.map((feature, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded-md bg-muted/50 text-muted-foreground">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {option.requiresThesis ? (
                    <Button
                      onClick={() => {
                        setSelectedStrategy(option.id);
                        setShowCustomize(true);
                      }}
                      disabled={isSubmitting}
                      className="flex-1 h-10"
                      variant="outline"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Enter Thesis
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleQuickStart(option.id)}
                        disabled={isSubmitting}
                        className="flex-1 h-10"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                        ) : (
                          <><Zap className="w-4 h-4 mr-2" /> Quick Start</>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedStrategy(option.id);
                          setShowCustomize(true);
                          setThesis('');
                          setTitle('');
                        }}
                        disabled={isSubmitting}
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        title="Customize"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customization Panel */}
      {showCustomize && currentOption && (
        <div className={cn(
          'rounded-lg border-2 p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200',
          currentOption.borderColor,
          'bg-gradient-to-br',
          currentOption.bgGradient
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', currentOption.color, 'bg-background/50')}>
                {currentOption.icon}
              </div>
              <div>
                <h3 className="font-semibold">{currentOption.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {currentOption.requiresThesis ? 'Enter your thesis below' : 'Customize your research (optional)'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCustomize(false);
                setSelectedStrategy(null);
              }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., ${currentOption.name} - Q1 2026`}
                className="h-10 bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thesis" className="text-sm font-medium">
                {currentOption.requiresThesis ? 'Investment Thesis' : 'Custom Focus'}{' '}
                {!currentOption.requiresThesis && (
                  <span className="text-muted-foreground font-normal">(optional)</span>
                )}
              </Label>
              <Textarea
                id="thesis"
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder={
                  currentOption.requiresThesis
                    ? 'Describe your investment hypothesis...\n\nExamples:\n• Analyze AAPL as a value investment\n• Research the shipping industry outlook\n• Investigate small-cap biotech opportunities'
                    : `Leave blank to use default strategy, or specify focus:\n\n${currentOption.defaultThesis}`
                }
                rows={5}
                className="resize-none text-sm leading-relaxed bg-background/50"
                required={currentOption.requiresThesis}
              />
              {!currentOption.requiresThesis && (
                <p className="text-xs text-muted-foreground">
                  Leave blank for autonomous discovery, or add specific criteria.
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-11">
              {isSubmitting && submittingStrategy === currentOption.id ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting Research...</>
              ) : (
                <>Start {currentOption.shortName} Research <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Info Footer */}
      <div className="text-center">
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <span>How does this work?</span>
            <ChevronDown className="w-3 h-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="max-w-lg mx-auto text-left bg-muted/30 rounded-lg p-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1</span>
                <p><strong>Research:</strong> Gemini AI conducts deep research on investment opportunities.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">2</span>
                <p><strong>Council:</strong> Investment council debates and scrutinizes the findings.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">3</span>
                <p><strong>Verdict:</strong> Final recommendation with buy/sell/hold decision.</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
