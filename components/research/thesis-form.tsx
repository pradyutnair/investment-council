'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ThesisForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [thesis, setThesis] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!thesis.trim()) {
      toast.error('Please enter your investment thesis');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create research session
      const response = await fetch('/api/research/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || thesis.substring(0, 100) + '...',
          thesis,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create research session');
      }

      const { sessionId } = await response.json();
      toast.success('Research session created');

      // Redirect to research session page
      router.push(`/dashboard/research/${sessionId}`);
    } catch (error) {
      console.error('Error creating research session:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Short-term opportunities in undervalued tech stocks"
        />
      </div>

      {/* Thesis */}
      <div className="space-y-2">
        <Label htmlFor="thesis">Investment Thesis / Query *</Label>
        <Textarea
          id="thesis"
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          placeholder="Describe your investment hypothesis, specific query, or area of research you'd like to explore...

Examples:
• 'Research undervalued semiconductor companies that could benefit from AI infrastructure buildout'
• 'Analyze the investment case for distressed retail properties in secondary markets'
• 'Investigate short-term catalysts for small-cap biotech companies with Phase 2 data readouts expected'"
          rows={10}
          className="resize-none"
          required
        />
        <p className="text-xs text-muted-foreground">
          Be specific about your thesis or question. The AI council will research and debate this from multiple angles.
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Research Session...
          </>
        ) : (
          'Start Research Council'
        )}
      </Button>
    </form>
  );
}
