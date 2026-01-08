import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDealMemo, updateResearchReport } from '@/lib/actions/deals';
import { geminiResearch } from '@/src/services/gemini-research';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for deep research

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { dealId } = await req.json();
    
    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required' }, { status: 400 });
    }

    // Load deal
    const deal = await getDealMemo(dealId);
    
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    if (deal.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Start research
          const researchGenerator = geminiResearch.startResearch({
            dealId: deal.id,
            thesis: deal.thesis,
            companyName: deal.company_name,
            ticker: deal.ticker || undefined,
            contextFiles: deal.context_files || undefined,
          });

          // Stream thought steps to client
          for await (const step of researchGenerator) {
            if (step.type === 'complete') {
              // Save final report to database
              await updateResearchReport(dealId, step.report);
              
              // Send completion event
              const data = JSON.stringify({ type: 'complete', report: step.report });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              break;
            } else {
              // Send thought step
              const data = JSON.stringify(step);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.close();
        } catch (error) {
          console.error('Research error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Research failed',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
