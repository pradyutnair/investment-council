import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession, updateResearchReport } from '@/lib/actions/research';
import { geminiResearch } from '@/src/services/gemini-research';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for deep research (Vercel hobby limit)

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
          // Update status to 'researching' when research actually starts
          await supabase
            .from('research_sessions')
            .update({ status: 'researching', research_started_at: new Date().toISOString() })
            .eq('id', sessionId);

          // Start research
          const researchGenerator = geminiResearch.startResearch({
            thesis: session.thesis,
          });

          // Stream to client - only send completion/error events, not progress
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
            }
            // Server-side logging only - don't stream progress to client
            console.log(`[Research ${sessionId}] ${step.type}: ${step.content}`);
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
