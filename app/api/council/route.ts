import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDealMemo, updateCritiques } from '@/lib/actions/deals';
import { runCouncilCritique } from '@/src/mastra/workflows/council-critique';

export const maxDuration = 120; // 2 minutes for council critique

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

    if (!deal.research_report) {
      return NextResponse.json({ error: 'No research report available' }, { status: 400 });
    }

    if (!deal.council_enabled) {
      return NextResponse.json({ error: 'Council critique not enabled for this deal' }, { status: 400 });
    }

    // Run council critique workflow
    const result = await runCouncilCritique({
      companyName: deal.company_name,
      ticker: deal.ticker || undefined,
      thesis: deal.thesis,
      researchReport: deal.research_report,
    });

    // Save critiques to database
    await updateCritiques(dealId, result.critiques);

    return NextResponse.json({
      success: true,
      critiques: result.critiques,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Council API error:', error);
    return NextResponse.json(
      { 
        error: 'Council critique failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
