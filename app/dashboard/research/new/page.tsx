import { ThesisForm } from '@/components/research/thesis-form';
import { Sparkles, Brain, MessageSquare, Scale } from 'lucide-react';

export default function NewResearchPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-foreground/5 mb-4">
            <Sparkles className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Investment Research Council
          </h1>
          <p className="text-muted-foreground text-[15px]">
            Submit your investment thesis for AI-powered deep research and analysis
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 mb-3">
              <Brain className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-[13px] font-medium mb-1">Deep Research</p>
            <p className="text-[12px] text-muted-foreground">
              Gemini analyzes your thesis comprehensively
            </p>
          </div>
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 mb-3">
              <MessageSquare className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-[13px] font-medium mb-1">Council Debate</p>
            <p className="text-[12px] text-muted-foreground">
              Multiple AI agents critique findings
            </p>
          </div>
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 mb-3">
              <Scale className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-[13px] font-medium mb-1">Final Verdict</p>
            <p className="text-[12px] text-muted-foreground">
              You decide with full context
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <ThesisForm />
        </div>
      </div>
    </div>
  );
}
