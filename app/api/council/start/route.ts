import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession, addCouncilAnalysis, updateCouncilDebate } from '@/src/lib/actions/research';
import { councilService } from '@/src/services/council-service';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for council analysis

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

    if (!session.research_report) {
      return NextResponse.json({ error: 'Research report not found' }, { status: 400 });
    }

    // TypeScript now knows research_report is not null
    const researchReport = session.research_report;
    const thesis = session.thesis;

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', content: 'Convening investment council...' })}\n\n`));

          // Run council analysis
          const { analyses, debate } = await councilService.runCouncilAnalysis({
            researchReport,
            thesis,
          });

          // Send individual analyses as they complete
          for (const analysis of analyses) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'analysis',
              agent: analysis.agent,
              role: analysis.role,
              content: analysis.analysis,
            })}\n\n`));

            // Save to database
            await addCouncilAnalysis(sessionId, analysis.role, analysis.analysis);
          }

          // Send debate rounds
          for (const round of debate) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'debate_round',
              round: round.round,
              messages: round.messages,
            })}\n\n`));
          }

          // Save complete debate to database
          await updateCouncilDebate(sessionId, debate);

          // Send completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Council analysis error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Council analysis failed',
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
    console.error('Council API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
