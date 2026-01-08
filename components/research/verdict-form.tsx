'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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

      if (!response.ok) {
        throw new Error('Failed to set verdict');
      }

      toast.success('Verdict recorded!');
      onVerdictSet(selectedVerdict);
    } catch (error) {
      console.error('Verdict error:', error);
      toast.error('Failed to record verdict');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Your Investment Decision</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Button
            variant={selectedVerdict === 'invest' ? 'default' : 'outline'}
            onClick={() => setSelectedVerdict('invest')}
            className="h-auto py-3 flex flex-col gap-1"
            disabled={isSubmitting}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">Invest</span>
          </Button>
          <Button
            variant={selectedVerdict === 'pass' ? 'destructive' : 'outline'}
            onClick={() => setSelectedVerdict('pass')}
            className="h-auto py-3 flex flex-col gap-1"
            disabled={isSubmitting}
          >
            <span className="text-sm font-medium">Pass</span>
          </Button>
          <Button
            variant={selectedVerdict === 'watch' ? 'secondary' : 'outline'}
            onClick={() => setSelectedVerdict('watch')}
            className="h-auto py-3 flex flex-col gap-1"
            disabled={isSubmitting}
          >
            <span className="text-sm font-medium">Watch</span>
          </Button>
        </div>
      </div>

      <div>
        <Label>Confidence Level</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(['high', 'medium', 'low'] as const).map((level) => (
            <Button
              key={level}
              variant={confidence === level ? 'default' : 'outline'}
              onClick={() => setConfidence(level)}
              disabled={isSubmitting}
              className="capitalize"
            >
              {level}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="note">Notes (optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any additional context or reasoning for your decision..."
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!selectedVerdict || !confidence || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Recording...
          </>
        ) : (
          'Record Verdict'
        )}
      </Button>
    </div>
  );
}
