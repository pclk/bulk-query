import { NextResponse } from 'next/server';
import { processRequestSchema } from '@/lib/schemas/task';

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

    // Placeholder processing logic (replace with AI API call)
    let output = chunk.text;

    if (taskPrompt.toLowerCase().includes('flashcard')) {
      const sentences = chunk.text.split(/[.!?]+/).filter((s: string) => s.trim());
      output = sentences
        .slice(0, 3)
        .map((s: string, i: number) => `What is discussed in sentence ${i + 1}?;${s.trim()}`)
        .join('\n');
    } else if (taskPrompt.toLowerCase().includes('summarize')) {
      const words = chunk.text.split(/\s+/);
      output = `Summary: ${words.slice(0, Math.min(50, words.length)).join(' ')}...`;
    } else if (taskPrompt.toLowerCase().includes('bullet')) {
      const sentences = chunk.text.split(/[.!?]+/).filter((s: string) => s.trim());
      output = sentences.map((s: string) => `- ${s.trim()}`).join('\n');
    } else {
      output = `[Processed with: ${taskPrompt}]\n\n${chunk.text}`;
    }

    return NextResponse.json({ output });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
