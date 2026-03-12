import { z } from 'zod';
import { DEFAULT_CHUNK_PARSE_MODE, reparseChunks } from '@/lib/chunk-parsing';
import {
  resolveChunkingOptions,
  type Chunk,
  type ChunkingMethod,
  type ChunkingOptions,
  type ResolvedChunkingOptions,
} from '@/lib/schemas/task';
import { countWords, generateId } from '@/lib/utils';

const manifestChunkSchema = z.object({
  title: z.string().optional(),
  start: z.string().min(1, 'Chunk start anchor is required'),
  end: z.string().min(1, 'Chunk end anchor is required'),
  lines: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  ctx: z.string().nullable().optional(),
});

const chunkManifestSchema = z.object({
  chunks: z.array(manifestChunkSchema).min(1, 'At least one chunk is required'),
});

export const SECTION_CHUNKER_SYSTEM_BASE = `You are a document section analyzer. Your task is to identify semantic boundaries in text and output a structured chunking manifest - NOT the content itself.

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

### Context Preambles
Write preambles that define key terms used but not introduced in this chunk, situate the chunk in the broader narrative, and are under 40 words. Use null if self-contained.

## What NOT to Output
- Do NOT output the actual text content
- Do NOT add commentary outside the JSON
- Do NOT use markdown formatting around the JSON
- Do NOT truncate the chunks array — list ALL chunks`;

export function buildSizeGuidance(
  text: string,
  chunking: ResolvedChunkingOptions
) {
  const totalWords = countWords(text);

  if (chunking.strategy === 'count') {
    const targetChunkCount = chunking.targetChunkCount ?? 6;
    const targetWordsPerChunk = Math.max(250, Math.round(totalWords / targetChunkCount));
    const minWords = Math.max(150, Math.floor(targetWordsPerChunk * 0.7));
    const maxWords = Math.max(minWords + 100, Math.ceil(targetWordsPerChunk * 1.3));

    return {
      minWords,
      maxWords,
      instructions: `### Size Guidelines - CRITICAL
Target approximately ${targetChunkCount} chunks total.
Aim for about ${targetWordsPerChunk} words per chunk.
Try to keep most chunks between ${minWords} and ${maxWords} words.
Producing ${Math.max(1, targetChunkCount - 1)}-${targetChunkCount + 1} chunks is acceptable if semantic boundaries require it.
Prefer balanced chunk sizes while keeping related material together.`,
    };
  }

  const minWords = chunking.minChunkWords ?? 750;
  const maxWords = chunking.maxChunkWords ?? 1500;
  const targetWordsPerChunk = Math.round((minWords + maxWords) / 2);

  return {
    minWords,
    maxWords,
    instructions: `### Size Guidelines - CRITICAL
Requested range: ${minWords}-${maxWords} words per chunk.
Aim for approximately ${targetWordsPerChunk} words per chunk when possible.
Never create tiny fragments far below ${minWords} words unless the source text itself is shorter.
Split only when a section clearly exceeds ${maxWords} words or contains distinct sub-topics.
Prefer fewer, larger chunks over many small fragments.`,
  };
}

export function buildChunkerSystem(
  text: string,
  chunking: ResolvedChunkingOptions
) {
  const guidance = buildSizeGuidance(text, chunking);
  return `${SECTION_CHUNKER_SYSTEM_BASE}

${guidance.instructions}`;
}

export function buildNumberedText(text: string) {
  return text
    .split('\n')
    .map((line, index) => `[L${index + 1}] ${line}`)
    .join('\n');
}

export function buildPromptChunkingInput(
  text: string,
  chunking?: ChunkingOptions
) {
  const resolvedChunking = resolveChunkingOptions(chunking);

  return [
    'Read the following system instructions and user message, then return only the JSON chunk manifest described there.',
    '',
    'SYSTEM:',
    buildChunkerSystem(text, resolvedChunking),
    '',
    'USER:',
    buildNumberedText(text),
  ].join('\n');
}

export function paragraphChunking(
  text: string,
  chunking: ResolvedChunkingOptions
) {
  const paragraphs = text
    .split('\n\n')
    .map((paragraph, index, allParagraphs) => {
      const priorLines = allParagraphs
        .slice(0, index)
        .reduce((total, item) => total + item.split('\n').length + 1, 0);

      return {
        text: paragraph,
        startLine: priorLines + 1,
        endLine: priorLines + paragraph.split('\n').length,
        wordCount: countWords(paragraph),
      };
    })
    .filter((paragraph) => paragraph.text.trim());

  if (paragraphs.length === 0) {
    return [];
  }

  const { minWords, maxWords } = buildSizeGuidance(text, chunking);
  const chunks: Chunk[] = [];
  let currentParagraphs: typeof paragraphs = [];
  let currentWords = 0;

  const pushCurrentChunk = () => {
    if (currentParagraphs.length === 0) {
      return;
    }

    const chunkText = currentParagraphs.map((paragraph) => paragraph.text).join('\n\n');
    const chunkWords = countWords(chunkText);
    const chunkTextWords = chunkText.trim().split(/\s+/);
    const chunkNumber = chunks.length + 1;

    chunks.push({
      id: `paragraph-${chunkNumber}`,
      title: `Section ${chunkNumber}`,
      start: chunkTextWords.slice(0, Math.min(7, chunkTextWords.length)).join(' '),
      end: chunkTextWords.slice(-Math.min(7, chunkTextWords.length)).join(' '),
      lines: [currentParagraphs[0].startLine, currentParagraphs[currentParagraphs.length - 1].endLine] as [number, number],
      ctx: chunks.length > 0 ? 'Continuation of previous discussion' : null,
      text: chunkText,
      wordCount: chunkWords,
      parseMode: DEFAULT_CHUNK_PARSE_MODE,
      method: 'paragraph',
    });

    currentParagraphs = [];
    currentWords = 0;
  };

  for (const paragraph of paragraphs) {
    const nextWords = currentWords + paragraph.wordCount;

    if (currentParagraphs.length > 0 && currentWords >= minWords && nextWords > maxWords) {
      pushCurrentChunk();
    }

    currentParagraphs.push(paragraph);
    currentWords += paragraph.wordCount;

    if (currentWords >= maxWords) {
      pushCurrentChunk();
    }
  }

  if (currentParagraphs.length > 0) {
    pushCurrentChunk();
  }

  if (chunks.length > 1 && chunks[chunks.length - 1].wordCount < minWords) {
    const lastChunk = chunks.pop();
    const previousChunk = chunks[chunks.length - 1];

    if (lastChunk && previousChunk) {
      const mergedText = `${previousChunk.text}\n\n${lastChunk.text}`;
      const mergedWords = countWords(mergedText);
      const mergedTextWords = mergedText.trim().split(/\s+/);

      previousChunk.lines = [previousChunk.lines[0], lastChunk.lines[1]];
      previousChunk.text = mergedText;
      previousChunk.wordCount = mergedWords;
      previousChunk.start = mergedTextWords.slice(0, Math.min(7, mergedTextWords.length)).join(' ');
      previousChunk.end = mergedTextWords.slice(-Math.min(7, mergedTextWords.length)).join(' ');
    }
  }

  return chunks;
}

function parseManifestObject(responseText: string) {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Chunk manifest JSON was not found in the chatbot output');
  }

  return chunkManifestSchema.parse(JSON.parse(jsonMatch[0]));
}

export function buildChunksFromManifest(
  rawText: string,
  manifestInput: string | z.infer<typeof chunkManifestSchema>,
  method: ChunkingMethod
) {
  const manifest = typeof manifestInput === 'string'
    ? parseManifestObject(manifestInput)
    : chunkManifestSchema.parse(manifestInput);
  const lines = rawText.split('\n');

  return reparseChunks(
    rawText,
    manifest.chunks.map((chunk, index) => {
      const startLine = Math.max(1, chunk.lines?.[0] ?? 1);
      const endLine = Math.min(lines.length, chunk.lines?.[1] ?? lines.length);

      return {
        id: generateId(),
        title: chunk.title || `Section ${index + 1}`,
        start: chunk.start,
        end: chunk.end,
        lines: [startLine, endLine] as [number, number],
        ctx: chunk.ctx || null,
        parseMode: DEFAULT_CHUNK_PARSE_MODE,
        method,
      };
    }),
    DEFAULT_CHUNK_PARSE_MODE
  ).chunks;
}

export function parseChunkManifestResponse(
  rawText: string,
  responseText: string,
  method: ChunkingMethod = 'prompt'
) {
  return buildChunksFromManifest(rawText, responseText, method);
}
