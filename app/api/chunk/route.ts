import { NextResponse } from 'next/server';
import { chunkRequestSchema } from '@/lib/schemas/task';
import { countWords, generateId } from '@/lib/utils';

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

    // Simple chunking algorithm (replace with AI-powered chunking)
    const paragraphs = text.split('\n\n').filter((p: string) => p.trim());
    const chunks = [];
    let currentLine = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const paraLines = para.split('\n').length;
      const words = countWords(para);

      if (words > 50) {
        const paraWords = para.trim().split(/\s+/);
        const start = paraWords.slice(0, Math.min(7, paraWords.length)).join(' ');
        const end = paraWords.slice(-Math.min(7, paraWords.length)).join(' ');

        chunks.push({
          id: generateId(),
          title: `Section ${chunks.length + 1}`,
          start,
          end,
          lines: [currentLine + 1, currentLine + paraLines] as [number, number],
          ctx: i > 0 ? 'Continuation of previous discussion' : null,
          text: para,
          wordCount: words,
        });
      }

      currentLine += paraLines + 1;
    }

    return NextResponse.json({ chunks });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
