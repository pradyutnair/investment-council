import { redirect } from 'next/navigation';
import { ThesisForm } from '@/components/research/thesis-form';

export default function NewResearchPage() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Investment Research Council</h1>
          <p className="text-muted-foreground">
            Submit your investment thesis for deep research and multi-model analysis
          </p>
        </div>

        <div className="mb-8 p-4 rounded-lg bg-muted/50 border border-border">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Submit your investment thesis or query</li>
            <li>Gemini Deep Research conducts comprehensive analysis</li>
            <li>ChatGPT (Skeptic) critiques the research</li>
            <li>Claude (Risk Officer) assesses risks</li>
            <li>Council debates the findings</li>
            <li>You deliberate with AI agents and reach a verdict</li>
          </ol>
        </div>

        <ThesisForm />
      </div>
    </div>
  );
}
