import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResearchSession, createDeliberationMessage } from '@/lib/actions/research';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, message, context } = await req.json();

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
    }

    const session = await getResearchSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await createDeliberationMessage(sessionId, 'user', message);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const researchContext = context || session.research_report?.substring(0, 3000) || 'No research available';

          // Include council analyses in context
          const councilContext = session.council_analyses && session.council_analyses.length > 0
            ? `\n\nCOUNCIL ANALYSES:\n${session.council_analyses.map((a: any) => `${a.role}: ${a.analysis?.substring(0, 500)}`).join('\n\n')}`
            : '';

          const systemPrompt = `You are an Investment Council Assistant helping the user deliberate on an investment opportunity.

The user has reviewed deep research and a council debate. Your role is to:

1. Answer questions about the research and council findings
2. Provide additional perspective and analysis
3. Help the user think critically about the investment
4. Be balanced - don't just confirm their biases

RESEARCH CONTEXT:
${researchContext}${councilContext}

Keep responses concise and focused. Use markdown for formatting.`;

          const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            stream: true,
            max_tokens: 2000,
          });

          let fullResponse = '';
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }

          await createDeliberationMessage(sessionId, 'assistant', fullResponse);
          controller.close();
        } catch (error) {
          console.error('Chat stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Chat failed' })}\n\n`));
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
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
