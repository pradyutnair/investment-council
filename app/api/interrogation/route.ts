import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDealMemo, getInterrogationMessages } from '@/lib/actions/deals';
import { Agent } from '@mastra/core';

export const maxDuration = 60;

// Create a specialized interrogation agent that has full context
function createInterrogationAgent(dealContext: {
  companyName: string;
  ticker?: string;
  thesis: string;
  report: string;
  critiques?: { skeptic?: string; risk_officer?: string };
}) {
  const { companyName, ticker, thesis, report, critiques } = dealContext;

  const contextPrompt = `You are an expert investment analyst helping a user make a final investment decision on ${companyName}${ticker ? ` (${ticker})` : ''}.

You have access to the complete research context:

# ORIGINAL THESIS
${thesis}

# DEEP RESEARCH REPORT
${report}

${critiques?.skeptic ? `# THE SKEPTIC'S CRITIQUE\n${critiques.skeptic}\n\n` : ''}
${critiques?.risk_officer ? `# THE RISK OFFICER'S ASSESSMENT\n${critiques.risk_officer}\n\n` : ''}

YOUR ROLE:
- Answer questions about this specific investment opportunity
- Synthesize information across the report and critiques
- Provide balanced, data-driven insights
- Help the user think through their decision
- Point out important considerations they may have missed

Be concise but thorough. When relevant, reference specific sections from the research or critiques.`;

  return new Agent({
    name: 'interrogation-agent',
    instructions: contextPrompt,
    model: {
      provider: 'ANTHROPIC',
      name: 'claude-3-5-sonnet-20241022',
      toolChoice: 'auto',
    } as any,
  });
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { dealId, message } = await req.json();
    
    if (!dealId || !message) {
      return NextResponse.json({ error: 'dealId and message are required' }, { status: 400 });
    }

    // Load deal
    const deal = await getDealMemo(dealId);
    
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    if (deal.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!deal.research_report) {
      return NextResponse.json({ error: 'No research report available' }, { status: 400 });
    }

    // Load conversation history
    const history = await getInterrogationMessages(dealId);

    // Create agent with full deal context
    const agent = createInterrogationAgent({
      companyName: deal.company_name,
      ticker: deal.ticker || undefined,
      thesis: deal.thesis,
      report: deal.research_report,
      critiques: deal.critiques ? {
        skeptic: deal.critiques.skeptic?.content,
        risk_officer: deal.critiques.risk_officer?.content,
      } : undefined,
    });

    // Build conversation context
    const conversationContext = history.length > 0
      ? '\n\n# CONVERSATION HISTORY\n' + 
        history.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n')
      : '';

    // Generate response
    const result = await agent.generate(`${conversationContext}\n\nUser: ${message}`);

    return NextResponse.json({
      response: result.text || 'No response generated',
    });
  } catch (error) {
    console.error('Interrogation API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
