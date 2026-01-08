import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteResearchSession } from '@/lib/actions/research';

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify the session belongs to the user before deleting
    const { data: session } = await supabase
      .from('research_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete related deliberation messages first
    await supabase
      .from('deliberation_messages')
      .delete()
      .eq('session_id', sessionId);

    // Delete the session
    await deleteResearchSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete research session error:', error);
    return NextResponse.json(
      { error: 'Failed to delete research session' },
      { status: 500 }
    );
  }
}
