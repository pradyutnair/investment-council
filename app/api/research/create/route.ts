import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createResearchSession } from '@/lib/actions/research';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, thesis } = await req.json();

    if (!thesis) {
      return NextResponse.json({ error: 'Thesis is required' }, { status: 400 });
    }

    const session = await createResearchSession(
      title || thesis.substring(0, 100) + '...',
      thesis
    );

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Create research session error:', error);
    return NextResponse.json(
      { error: 'Failed to create research session' },
      { status: 500 }
    );
  }
}
