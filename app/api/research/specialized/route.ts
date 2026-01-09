import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession } from '@/src/lib/actions/research';
import { runSpecializedResearch } from '@/src/services/specialized-research';
import type { ResearchStrategy } from '@/src/types/research';
import { isTestMode, generateMockSpecializedEvents, MOCK_SESSION_ID } from '@/lib/test-mode/mock-research-data';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for complete specialized research

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, strategy = 'general' } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Validate strategy
    const validStrategies: ResearchStrategy[] = ['value', 'special-sits', 'distressed', 'general'];
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json({
        error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`
      }, { status: 400 });
    }

    // Test mode: return mock SSE stream without DB call
    if (isTestMode() && sessionId === MOCK_SESSION_ID) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const phase of generateMockSpecializedEvents(strategy as ResearchStrategy)) {
              const data = JSON.stringify({
                type: phase.phase,
                agent: phase.agent,
                content: phase.content,
                timestamp: phase.timestamp,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
            controller.close();
          } catch (error) {
            console.error('Test mode error:', error);
            const errorData = JSON.stringify({
              type: 'error',
              content: error instanceof Error ? error.message : 'Mock data generation failed',
              timestamp: new Date().toISOString(),
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
          // Update status to 'researching'
          await supabase
            .from('research_sessions')
            .update({ 
              status: 'researching', 
              research_started_at: new Date().toISOString(),
              // Store strategy in metadata or a new column if available
            })
            .eq('id', sessionId);

          // Run specialized research
          const researchGenerator = runSpecializedResearch({
            sessionId,
            thesis: session.thesis,
            strategy: strategy as ResearchStrategy,
          });

          for await (const phase of researchGenerator) {
            // Stream phase updates to client
            const data = JSON.stringify({
              type: phase.phase,
              agent: phase.agent,
              content: phase.content,
              timestamp: phase.timestamp,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // If complete, save results to database
            if (phase.phase === 'complete' && phase.content) {
              try {
                const results = JSON.parse(phase.content);
                
                // Update research session with results
                await supabase
                  .from('research_sessions')
                  .update({
                    research_report: results.researchReport,
                    research_completed_at: new Date().toISOString(),
                    status: 'council_gather',
                    // Store strategy analysis and other results
                    council_analyses: [
                      {
                        agent: results.agentUsed,
                        role: strategy,
                        analysis: results.strategyAnalysis,
                        timestamp: new Date().toISOString(),
                      },
                      ...(results.skepticCritique ? [{
                        agent: 'skeptic',
                        role: 'Skeptic',
                        analysis: results.skepticCritique,
                        timestamp: new Date().toISOString(),
                      }] : []),
                      ...(results.riskAssessment ? [{
                        agent: 'risk-officer',
                        role: 'Risk Officer',
                        analysis: results.riskAssessment,
                        timestamp: new Date().toISOString(),
                      }] : []),
                    ].filter(a => a.analysis),
                    verdict: results.verdict || null,
                  })
                  .eq('id', sessionId);
              } catch (e) {
                console.error('Failed to parse/save results:', e);
              }
            }

            if (phase.phase === 'error') {
              // Update status on error
              await supabase
                .from('research_sessions')
                .update({ status: 'pending' })
                .eq('id', sessionId);
            }
          }

          controller.close();
        } catch (error) {
          console.error('Specialized research error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            content: error instanceof Error ? error.message : 'Research failed',
            timestamp: new Date().toISOString(),
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
    console.error('Specialized Research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
