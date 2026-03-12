import { describe, expect, it } from 'vitest';
import {
  buildPromptChunkingInput,
  paragraphChunking,
  parseChunkManifestResponse,
} from '@/lib/chunking';
import { resolveChunkingOptions } from '@/lib/schemas/task';

const rawText = [
  'Introduction paragraph opening words with some setup for the discussion.',
  'Still the introduction paragraph with enough words to matter for chunk sizing.',
  '',
  'Second paragraph starts here and covers a new subtopic in the document.',
  'It continues with additional detail so the fallback can group paragraphs sensibly.',
].join('\n');

describe('buildPromptChunkingInput', () => {
  it('includes the shared system prompt and numbered user text', () => {
    const prompt = buildPromptChunkingInput(rawText, {
      strategy: 'count',
      targetChunkCount: 3,
    });

    expect(prompt).toContain('SYSTEM:');
    expect(prompt).toContain('USER:');
    expect(prompt).toContain('[L1] Introduction paragraph opening words');
    expect(prompt).toContain('Target approximately 3 chunks total.');
  });
});

describe('paragraphChunking', () => {
  it('returns paragraph-based chunks tagged with the paragraph method', () => {
    const chunks = paragraphChunking(rawText, resolveChunkingOptions({
      strategy: 'range',
      minChunkWords: 10,
      maxChunkWords: 40,
    }));

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].method).toBe('paragraph');
    expect(chunks[0].parseMode).toBe('anchors');
  });
});

describe('parseChunkManifestResponse', () => {
  it('parses chatbot JSON output into prompt chunks', () => {
    const responseText = `Here is the manifest:

\`\`\`json
{
  "chunks": [
    {
      "title": "Introduction",
      "start": "Introduction paragraph opening words",
      "end": "chunk sizing.",
      "lines": [1, 2],
      "ctx": null
    },
    {
      "title": "Second Topic",
      "start": "Second paragraph starts here",
      "end": "group paragraphs sensibly.",
      "lines": [4, 5],
      "ctx": "Continuation of the document."
    }
  ]
}
\`\`\``;

    const chunks = parseChunkManifestResponse(rawText, responseText, 'prompt');

    expect(chunks).toHaveLength(2);
    expect(chunks[0].method).toBe('prompt');
    expect(chunks[1].text).toContain('Second paragraph starts here');
  });
});
