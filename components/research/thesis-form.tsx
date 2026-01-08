'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight } from 'lucide-react';
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
      router.push(`/dashboard/research/${sessionId}`);
    } catch (error) {
      console.error('Error creating research session:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          placeholder="Describe your investment hypothesis or query...

Examples:
• Research special situation opportunities in recent spinoffs
• Analyze deep value plays in the shipping sector
• Investigate catalyst-driven opportunities in small-cap biotech"
          rows={8}
          className="resize-none text-[14px] leading-relaxed"
          required
        />
        <p className="text-[12px] text-muted-foreground">
          Be specific about your thesis. The AI council will research and debate this from multiple angles.
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 text-[14px] font-medium"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Session...
          </>
        ) : (
          <>
            Start Research
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
