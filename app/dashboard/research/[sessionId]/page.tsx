import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession, getDeliberationMessages } from '@/lib/actions/research';
import { ResearchView } from '@/components/research/research-view';
import { isTestMode, MOCK_SESSION_ID } from '@/lib/test-mode/mock-research-data';

// Mock session data for test mode
function getMockSession(sessionId: string, userId: string) {
  return {
    id: sessionId,
    user_id: userId,
    title: 'Value Investing Discovery',
    thesis: 'Find deep value opportunities with strong margin of safety, low P/B ratios, and underappreciated assets.',
    strategy: 'value' as const,
    status: 'pending' as const,
    research_report: null,
    research_started_at: null,
    research_completed_at: null,
    council_analyses: [],
    council_debate: [],
    council_started_at: null,
    council_completed_at: null,
    verdict: null,
    verdict_note: null,
    confidence_level: null,
    finalized_at: null,
    discovered_opportunities: [],
    final_verdict: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default async function ResearchSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { sessionId } = await params;

  // Test mode: use mock session data
  if (isTestMode() && sessionId === MOCK_SESSION_ID) {
    const mockSession = getMockSession(sessionId, user.id);
    return (
      <ResearchView
        session={mockSession}
        initialMessages={[]}
      />
    );
  }

  const session = await getResearchSession(sessionId);

  if (!session || session.user_id !== user.id) {
    notFound();
  }

  const messages = await getDeliberationMessages(sessionId);

  return (
    <ResearchView
      session={session}
      initialMessages={messages}
    />
  );
}
