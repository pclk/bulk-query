import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'No API key provided' },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Minimal API call to verify the key works
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });

    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? 'Invalid API key'
        : 'Verification failed';

    return NextResponse.json({ valid: false, error: message }, { status: 401 });
  }
}
