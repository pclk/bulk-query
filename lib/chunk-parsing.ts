import type { Chunk, ChunkParseMode } from '@/lib/schemas/task';
import { countWords } from '@/lib/utils';

export const DEFAULT_CHUNK_PARSE_MODE: ChunkParseMode = 'anchors';

type ChunkDescriptor = Omit<Chunk, 'text' | 'wordCount'>;

interface ReparsingResult {
  chunks: Chunk[];
  fallbackCount: number;
}

function parseChunkTextByLines(rawText: string, chunk: Pick<Chunk, 'lines'>): string {
  const lines = rawText.split('\n');
  const startLine = Math.max(0, chunk.lines[0] - 1);
  const endLine = Math.min(lines.length, chunk.lines[1]);
  return lines.slice(startLine, endLine).join('\n');
}

function buildChunk(chunk: ChunkDescriptor, text: string, parseMode: ChunkParseMode): Chunk {
  return {
    ...chunk,
    text,
    wordCount: countWords(text),
    parseMode,
  };
}

export function getChunkParseMode(chunks: Array<Pick<Chunk, 'parseMode'>>): ChunkParseMode {
  if (chunks.length === 0) {
    return DEFAULT_CHUNK_PARSE_MODE;
  }

  return chunks[0]?.parseMode === 'anchors' ? 'anchors' : 'lines';
}

export function reparseChunks(
  rawText: string,
  chunks: ChunkDescriptor[],
  parseMode: ChunkParseMode
): ReparsingResult {
  if (parseMode === 'lines') {
    return {
      chunks: chunks.map((chunk) => buildChunk(chunk, parseChunkTextByLines(rawText, chunk), parseMode)),
      fallbackCount: 0,
    };
  }

  let cursor = 0;
  let fallbackCount = 0;

  return {
    chunks: chunks.map((chunk) => {
      const startIndex = rawText.indexOf(chunk.start, cursor);
      const endSearchStart = startIndex === -1 ? -1 : startIndex + chunk.start.length;
      const endIndex = endSearchStart === -1 ? -1 : rawText.indexOf(chunk.end, endSearchStart);

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        fallbackCount += 1;
        return buildChunk(chunk, parseChunkTextByLines(rawText, chunk), parseMode);
      }

      const nextCursor = endIndex + chunk.end.length;
      cursor = nextCursor;
      return buildChunk(chunk, rawText.slice(startIndex, nextCursor), parseMode);
    }),
    fallbackCount,
  };
}
