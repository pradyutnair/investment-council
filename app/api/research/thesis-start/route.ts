import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runResearch } from '@/src/mastra/workflows/thesis-based-investment';
import { getResearchSession } from '@/src/lib/actions/research';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes

/**
 * Simple research API
 * 1. Get session thesis
 * 2. Run Gemini research
 * 3. Save report
 * 4. Return
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const session = await getResearchSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // SSE stream for progress
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Update status to researching
      await supabase
        .from('research_sessions')
        .update({ status: 'researching', research_started_at: new Date().toISOString() })
        .eq('id', sessionId);

      send({ type: 'status', message: 'Starting research...' });

      const result = await runResearch(
        { thesis: session.thesis, strategy: session.strategy },
        (message) => send({ type: 'progress', message })
      );

      if (result.error) {
        send({ type: 'error', message: result.error });
        controller.close();
        return;
      }

      // Save report to database
      await supabase
        .from('research_sessions')
        .update({
          research_report: result.report,
          research_completed_at: new Date().toISOString(),
          status: 'deliberation',
        })
        .eq('id', sessionId);

      send({ type: 'complete', duration: result.duration });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
