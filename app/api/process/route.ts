import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { processRequestSchema } from '@/lib/schemas/task';

function fallbackProcess(text: string, taskPrompt: string): string {
  if (taskPrompt.toLowerCase().includes('flashcard')) {
    const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim());
    return sentences
      .slice(0, 3)
      .map((s: string, i: number) => `What is discussed in sentence ${i + 1}?;${s.trim()}`)
      .join('\n');
  }
  if (taskPrompt.toLowerCase().includes('summarize')) {
    const words = text.split(/\s+/);
    return `Summary: ${words.slice(0, Math.min(50, words.length)).join(' ')}...`;
  }
  if (taskPrompt.toLowerCase().includes('bullet')) {
    const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim());
    return sentences.map((s: string) => `- ${s.trim()}`).join('\n');
  }
  return `[Processed with: ${taskPrompt}]\n\n${text}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = processRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { chunk, taskPrompt } = parsed.data;
    const apiKey = request.headers.get('x-api-key');
    const model = request.headers.get('x-model') || 'claude-sonnet-4-6';

    // Fallback to local processing if no API key
    if (!apiKey) {
      return NextResponse.json({
        output: fallbackProcess(chunk.text, taskPrompt),
      });
    }

    const client = new Anthropic({ apiKey });

    const contextPrefix = chunk.ctx
      ? `[Context: ${chunk.ctx}]\n\n`
      : '';

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${taskPrompt}\n\n---\n\n${contextPrefix}${chunk.text}`,
        },
      ],
    });

    const output =
      message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ output });
  } catch (err: unknown) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Rate limit exceeded — try again shortly' }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
