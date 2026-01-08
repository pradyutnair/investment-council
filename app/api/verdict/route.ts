import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession, setVerdict } from '@/lib/actions/research';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, verdict, note, confidence } = await req.json();

    if (!sessionId || !verdict || !confidence) {
      return NextResponse.json(
        { error: 'sessionId, verdict, and confidence are required' },
        { status: 400 }
      );
    }

    const session = await getResearchSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await setVerdict(sessionId, verdict, note || '', confidence);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verdict API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
