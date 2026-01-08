'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { createDealMemo, updateDealStatus } from '@/lib/actions/deals';
import type { DealMemo } from '@/types/deals';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScoutFormProps {
  dealId: string | null;
  initialData?: DealMemo;
}

export function ScoutForm({ dealId, initialData }: ScoutFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: initialData?.company_name || '',
    ticker: initialData?.ticker || '',
    thesis: initialData?.thesis || '',
    council_enabled: initialData?.council_enabled ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name.trim() || !formData.thesis.trim()) {
      toast.error('Company name and thesis are required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (dealId) {
        // Update existing deal and start research
        const result = await updateDealStatus(dealId, 'researching');
        if (result.success) {
          // Trigger research API
          const response = await fetch('/api/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dealId }),
          });
          
          if (response.ok) {
            toast.success('Research commissioned successfully');
            router.refresh();
          } else {
            toast.error('Failed to start research');
          }
        }
      } else {
        // Create new deal
        const result = await createDealMemo({
          company_name: formData.company_name,
          ticker: formData.ticker || undefined,
          thesis: formData.thesis,
          council_enabled: formData.council_enabled,
        });
        
        if ('id' in result) {
          toast.success('Deal memo created');
          router.push(`/dashboard/deal/${result.id}`);
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Commission Deep Research</h2>
          <p className="text-muted-foreground">
            Provide your investment thesis and context for the Gemini Deep Research agent.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="e.g., Acme Corporation"
              disabled={!!dealId}
              required
            />
          </div>

          {/* Ticker */}
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker Symbol</Label>
            <Input
              id="ticker"
              value={formData.ticker}
              onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
              placeholder="e.g., ACME"
              className="font-mono"
              disabled={!!dealId}
            />
          </div>

          {/* Thesis */}
          <div className="space-y-2">
            <Label htmlFor="thesis">Investment Thesis / Query *</Label>
            <Textarea
              id="thesis"
              value={formData.thesis}
              onChange={(e) => setFormData({ ...formData, thesis: e.target.value })}
              placeholder="Describe your investment hypothesis, key questions, or areas to investigate..."
              rows={8}
              className="resize-none"
              disabled={!!dealId}
              required
            />
            <p className="text-xs text-muted-foreground">
              Be specific about what you want the research agent to investigate.
            </p>
          </div>

          {/* Context Files */}
          <div className="space-y-2">
            <Label>Context Files</Label>
            <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
              <button
                type="button"
                className="w-full p-8 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={!!dealId}
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Upload 10-Ks, earnings transcripts, or research notes</span>
                <span className="text-xs">Coming soon - File upload integration</span>
              </button>
            </Card>
          </div>

          {/* Council Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="council_enabled" className="text-base">
                Enable Council Critique
              </Label>
              <p className="text-sm text-muted-foreground">
                After research completes, convene ChatGPT (Skeptic) and Claude (Risk Officer) for critique
              </p>
            </div>
            <Switch
              id="council_enabled"
              checked={formData.council_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, council_enabled: checked })}
              disabled={!!dealId}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {dealId ? 'Commissioning Research...' : 'Creating Deal Memo...'}
                </>
              ) : (
                dealId ? 'Commission Deep Research' : 'Create Deal Memo'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
