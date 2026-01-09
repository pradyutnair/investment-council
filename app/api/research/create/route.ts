import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createResearchSession } from '@/src/lib/actions/research';
import type { ResearchStrategy } from '@/src/types/research';
import { isTestMode, MOCK_SESSION_ID } from '@/lib/test-mode/mock-research-data';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, thesis, strategy = 'general' } = await req.json();

    if (!thesis) {
      return NextResponse.json({ error: 'Thesis is required' }, { status: 400 });
    }

    // Validate strategy
    const validStrategies: ResearchStrategy[] = ['value', 'special-sits', 'distressed', 'general'];
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json({
        error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`
      }, { status: 400 });
    }

    // Test mode: return mock session ID without database call
    if (isTestMode()) {
      return NextResponse.json({
        sessionId: MOCK_SESSION_ID,
        strategy,
        _testMode: true,
      });
    }

    const session = await createResearchSession(
      title || thesis.substring(0, 100) + '...',
      thesis,
      strategy
    );

    return NextResponse.json({ sessionId: session.id, strategy });
  } catch (error) {
    console.error('Create research session error:', error);
    return NextResponse.json(
      { error: 'Failed to create research session' },
      { status: 500 }
    );
  }
}
