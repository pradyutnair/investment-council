import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession, updateResearchReport } from '@/lib/actions/research';
import { geminiResearch } from '@/src/services/gemini-research';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for deep research

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Load session
    const session = await getResearchSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Start research
          const researchGenerator = geminiResearch.startResearch({
            thesis: session.thesis,
            dealId: session.id,
          });

          // Stream thought steps to client
          for await (const step of researchGenerator) {
            if (step.type === 'complete') {
              // Save final report to database
              await updateResearchReport(sessionId, step.report);

              // Send completion event
              const data = JSON.stringify({ type: 'complete', report: step.report });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              break;
            } else if (step.type === 'error') {
              // Send error event - don't save report
              const data = JSON.stringify({ type: 'error', content: step.content });
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
