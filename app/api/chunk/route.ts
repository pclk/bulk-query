import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { chunkRequestSchema } from '@/lib/schemas/task';
import { countWords, generateId } from '@/lib/utils';

const SECTION_CHUNKER_SYSTEM = `You are a document section analyzer. Your task is to identify semantic boundaries in text and output a structured chunking manifest — NOT the content itself.

## Your Goal

Divide the input text into self-contained, topically coherent sections that can be processed independently by downstream systems (e.g., flashcard generators, summarizers, Q&A systems).

## Output Format

Respond ONLY with valid JSON in this exact structure:

{
  "chunks": [
    {
      "title": "<3-7 word topic>",
      "start": "<first 5-8 words verbatim>",
      "end": "<last 5-8 words verbatim>",
      "lines": [<start>, <end>],
      "ctx": "<15-30 word context preamble OR null if self-contained>"
    }
  ]
}

## Chunking Rules

### Boundary Selection
1. Anchor phrases must be VERBATIM — copy exactly from the text, including punctuation
2. Anchors must be UNIQUE — if a phrase appears multiple times, extend it until unique
3. Never split mid-sentence, mid-example, mid-proof, between a term and its explanation, or between a question and its answer

### Semantic Coherence
Each chunk should answer: "What ONE topic or concept does this section cover?"

### Size Guidelines
Target: 200-1000 tokens per chunk (roughly 150-750 words)
Minimum: ~200 tokens. Maximum: ~1500 tokens.

### Context Preambles
Write preambles that define key terms used but not introduced in this chunk, situate the chunk in the broader narrative, and are under 40 words. Use null if self-contained.

## What NOT to Output
- Do NOT output the actual text content
- Do NOT add commentary outside the JSON
- Do NOT use markdown formatting around the JSON
- Do NOT truncate the chunks array — list ALL chunks`;

function fallbackChunking(text: string) {
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

  return chunks;
}

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
    const apiKey = request.headers.get('x-api-key');
    const model = request.headers.get('x-model') || 'claude-sonnet-4-5-20250929';

    // Fallback to local chunking if no API key
    if (!apiKey) {
      return NextResponse.json({ chunks: fallbackChunking(text) });
    }

    const client = new Anthropic({ apiKey });

    // Add line numbers to the text for the AI
    const numberedText = text
      .split('\n')
      .map((line: string, i: number) => `[L${i + 1}] ${line}`)
      .join('\n');

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      system: SECTION_CHUNKER_SYSTEM,
      messages: [
        {
          role: 'user',
          content: numberedText,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'AI returned invalid chunking format' },
        { status: 502 }
      );
    }

    const manifest = JSON.parse(jsonMatch[0]);
    const lines = text.split('\n');

    // Build actual chunks with text content from the manifest
    const chunks = manifest.chunks.map(
      (c: { title: string; start: string; end: string; lines: [number, number]; ctx: string | null }, i: number) => {
        const startLine = Math.max(0, (c.lines?.[0] ?? 1) - 1);
        const endLine = Math.min(lines.length, c.lines?.[1] ?? lines.length);
        const chunkText = lines.slice(startLine, endLine).join('\n');

        return {
          id: generateId(),
          title: c.title || `Section ${i + 1}`,
          start: c.start,
          end: c.end,
          lines: c.lines || [startLine + 1, endLine],
          ctx: c.ctx || null,
          text: chunkText,
          wordCount: countWords(chunkText),
        };
      }
    );

    return NextResponse.json({ chunks });
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
