import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runThesisBasedInvestment } from '@/src/mastra/workflows/thesis-based-investment';
import {
  getResearchSession,
  updateSessionStatus,
  updateSessionDiscoveredOpportunities,
  updateOpportunityAnalysis,
  setSessionFinalVerdict,
  getResearchOpportunities,
  insertDiscoveredOpportunities,
} from '@/src/lib/actions/research';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes for full workflow

/**
 * API Route for Thesis-Based Investment Workflow
 *
 * This orchestrates the complete workflow:
 * 1. Discover opportunities from thesis
 * 2. Research each opportunity
 * 3. Run strategy and critique analysis
 * 4. Generate final verdict
 *
 * Uses SSE for streaming progress updates
 */
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
          const sendEvent = (type: string, data: any) => {
            const eventData = JSON.stringify({ type, ...data });
            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
          }

          // Update status to discovering
          await updateSessionStatus(sessionId, 'discovering');
          sendEvent('status', { stage: 'discovering', message: 'Discovering investment opportunities from your thesis...' });

          // Run the thesis-based workflow
          const result = await runThesisBasedInvestment({
            thesis: session.thesis,
            title: session.title,
            strategy: session.strategy,
            maxOpportunities: 3,
          });

          // Save discovered opportunities
          sendEvent('status', { stage: 'discovered', message: `Discovered ${result.discovered.length} opportunities` });

          await updateSessionDiscoveredOpportunities(
            sessionId,
            result.discovered.map(opp => ({
              ticker: opp.ticker,
              companyName: opp.companyName,
              thesis: opp.thesis,
              type: opp.type,
              keyMetrics: opp.keyMetrics,
              riskLevel: opp.riskLevel,
              score: opp.score,
            }))
          );

          await insertDiscoveredOpportunities(sessionId, result.discovered.map(opp => ({
            ticker: opp.ticker,
            companyName: opp.companyName,
            thesis: opp.thesis,
            type: opp.type,
            keyMetrics: opp.keyMetrics,
            riskLevel: opp.riskLevel,
            score: opp.score,
          })));

          // Update status to researching
          await updateSessionStatus(sessionId, 'researching');
          sendEvent('status', { stage: 'researching', message: 'Researching each opportunity with Gemini Deep Research...' });

          // Process each opportunity
          const opportunities = await getResearchOpportunities(sessionId);

          for (let i = 0; i < result.analyzed.length; i++) {
            const analyzed = result.analyzed[i];
            const opportunity = opportunities.find(o => o.ticker === analyzed.opportunity.ticker);

            if (opportunity) {
              // Update to researching
              await updateOpportunityAnalysis(opportunity.id, { status: 'researching' });
              sendEvent('progress', {
                current: i + 1,
                total: result.analyzed.length,
                ticker: analyzed.opportunity.ticker,
                stage: 'researching',
              });

              // Save research report
              if (analyzed.researchReport) {
                await updateOpportunityAnalysis(opportunity.id, {
                  research_report: analyzed.researchReport,
                  status: 'analyzing',
                });
                sendEvent('progress', {
                  current: i + 1,
                  total: result.analyzed.length,
                  ticker: analyzed.opportunity.ticker,
                  stage: 'analyzing',
                  message: 'Running strategy and critique analysis...',
                });
              }

              // Save strategy analysis
              if (analyzed.strategyAnalysis) {
                await updateOpportunityAnalysis(opportunity.id, {
                  strategy_analysis: analyzed.strategyAnalysis,
                });
              }

              // Save critiques
              if (analyzed.critiques) {
                await updateOpportunityAnalysis(opportunity.id, {
                  critiques: analyzed.critiques,
                });
              }

              // Save verdict
              if (analyzed.verdict) {
                await updateOpportunityAnalysis(opportunity.id, {
                  verdict: analyzed.verdict,
                  final_score: analyzed.finalScore,
                  status: 'completed',
                });
              }

              // Save errors if any
              if (analyzed.errors && analyzed.errors.length > 0) {
                await updateOpportunityAnalysis(opportunity.id, {
                  errors: analyzed.errors,
                  status: 'completed',
                });
              }
            }
          }

          // Update session with final verdict
          if (result.finalVerdict) {
            await setSessionFinalVerdict(sessionId, result.finalVerdict);
            sendEvent('verdict', result.finalVerdict);
          }

          // Send complete event with summary
          sendEvent('complete', {
            summary: result.summary,
            duration: result.duration,
            opportunities: result.analyzed.map(a => ({
              ticker: a.opportunity.ticker,
              companyName: a.opportunity.companyName,
              score: a.finalScore,
              verdict: a.verdict ? parseVerdict(a.verdict).decision : 'unknown',
            })),
          });

          controller.close();
        } catch (error) {
          console.error('Thesis-based workflow error:', error);

          // Update status to deliberation even on error so user can see partial results
          await updateSessionStatus(sessionId, 'deliberation').catch(() => {});

          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Workflow failed',
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
    console.error('Thesis-based API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse verdict from verdict agent response
 */
function parseVerdict(verdictText: string): { decision: string; confidence: number } {
  const decisionMatch = verdictText.match(/## Decision\s*\n\s*🎯\s*\*\*([A-Z]+)\*\*/);
  const decision = decisionMatch ? decisionMatch[1] : 'WATCH';

  const confidenceMatch = verdictText.match(/with\s*\*\*(\d+)%\*\*\s*conviction/);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 50;

  return { decision, confidence };
}
