import { NextRequest, NextResponse } from 'next/server';
import { getAgent, getAvailableAgents } from '@/mastra';

/**
 * Chat API Endpoint
 *
 * POST /api/chat
 *
 * Request body:
 * {
 *   messages: Array<{ role: 'user' | 'assistant', content: string }>
 *   agentId: 'value-investor' | 'special-situations-investor' | 'distressed-investor'
 * }
 *
 * Returns: Streaming text response from the specified agent
 */

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { messages, agentId } = body;

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format. Expected array of messages.' },
        { status: 400 }
      );
    }

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid agentId. Expected string.' },
        { status: 400 }
      );
    }

    // Get requested agent
    const agent = getAgent(agentId);

    // Stream response from agent
    const result = await agent.stream(messages);

    // Return streaming response
    // The result should have a method to get the stream
    const resultAny = result as any;
    if (resultAny.toDataStream) {
      return new Response(resultAny.toDataStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else if (result.textStream) {
      // Alternative API - use the text stream directly
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
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
    } else {
      // Fallback to non-streaming response
      return NextResponse.json({
        error: 'Streaming not available for this agent configuration',
        result: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);

    // Handle agent not found
    if (error instanceof Error && error.message.includes('Agent not found')) {
      return NextResponse.json(
        {
          error: error.message,
          availableAgents: getAvailableAgents(),
        },
        { status: 404 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 *
 * Returns available agents
 */
export async function GET() {
  return NextResponse.json({
    agents: getAvailableAgents().map((id) => ({
      id,
      name: id
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()),
    })),
  });
}
