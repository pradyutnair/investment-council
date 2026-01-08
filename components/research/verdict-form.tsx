'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, TrendingUp, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VerdictFormProps {
  sessionId: string;
  onVerdictSet: (verdict: string) => void;
}

export function VerdictForm({ sessionId, onVerdictSet }: VerdictFormProps) {
  const [selectedVerdict, setSelectedVerdict] = useState<'invest' | 'pass' | 'watch' | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedVerdict || !confidence) {
      toast.error('Please select a verdict and confidence level');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          verdict: selectedVerdict,
          note,
          confidence,
        }),
      });

      if (!response.ok) throw new Error('Failed to set verdict');
      onVerdictSet(selectedVerdict);
    } catch (error) {
      console.error('Verdict error:', error);
      toast.error('Failed to record verdict');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verdictOptions = [
    { value: 'invest', label: 'Invest', icon: TrendingUp, color: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    { value: 'pass', label: 'Pass', icon: X, color: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400' },
    { value: 'watch', label: 'Watch', icon: Eye, color: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  ] as const;

  const confidenceOptions = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ] as const;

  return (
    <div className="flex items-center gap-6">
      {/* Verdict Selection */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-muted-foreground mr-1">Verdict:</span>
        {verdictOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedVerdict(option.value)}
            disabled={isSubmitting}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              selectedVerdict === option.value
                ? option.color
                : "border-border hover:border-foreground/20 text-muted-foreground hover:text-foreground"
            )}
          >
            <option.icon className="w-3.5 h-3.5" />
            {option.label}
          </button>
        ))}
      </div>

      {/* Confidence Selection */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-muted-foreground mr-1">Confidence:</span>
        {confidenceOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setConfidence(option.value)}
            disabled={isSubmitting}
            className={cn(
              "px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              confidence === option.value
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:border-foreground/20 text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Note Input */}
      <div className="flex-1">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          rows={1}
          className="resize-none min-h-[36px] text-[13px]"
          disabled={isSubmitting}
        />
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!selectedVerdict || !confidence || isSubmitting}
        className="h-9 px-4 text-[13px]"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Record Verdict'
        )}
      </Button>
    </div>
  );
}
