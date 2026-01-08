import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession, getDeliberationMessages } from '@/lib/actions/research';
import { ResearchView } from '@/components/research/research-view';

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
