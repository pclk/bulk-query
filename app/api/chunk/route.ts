import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildChunkerSystem, buildNumberedText, parseChunkManifestResponse } from '@/lib/chunking';
import { chunkRequestSchema, resolveChunkingOptions } from '@/lib/schemas/task';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = chunkRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { text } = parsed.data;
    const chunking = resolveChunkingOptions(parsed.data.chunking);
    const apiKey = request.headers.get('x-api-key');
    const model = request.headers.get('x-model') || 'claude-sonnet-4-6';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API chunking requires an Anthropic API key' },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      system: buildChunkerSystem(text, chunking),
      messages: [
        {
          role: 'user',
          content: buildNumberedText(text),
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const chunks = parseChunkManifestResponse(text, responseText, 'api');

    return NextResponse.json({ chunks });
  } catch (err: unknown) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'Rate limit exceeded — try again shortly' },
        { status: 429 }
      );
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
