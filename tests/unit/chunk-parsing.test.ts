import { describe, expect, it } from 'vitest';
import { DEFAULT_CHUNK_PARSE_MODE, getChunkParseMode, reparseChunks } from '@/lib/chunk-parsing';

const rawText = [
  'Intro line',
  'Alpha begins here and continues.',
  'Alpha still continues.',
  'Beta begins here and wraps up.',
  'Beta closing line.',
].join('\n');

const chunkDescriptors = [
  {
    id: 'chunk-1',
    title: 'Alpha',
    start: 'Alpha begins here',
    end: 'Alpha still continues.',
    lines: [2, 3] as [number, number],
    ctx: null,
    parseMode: DEFAULT_CHUNK_PARSE_MODE,
  },
  {
    id: 'chunk-2',
    title: 'Beta',
    start: 'Beta begins here',
    end: 'Beta closing line.',
    lines: [4, 5] as [number, number],
    ctx: null,
    parseMode: DEFAULT_CHUNK_PARSE_MODE,
  },
];

describe('reparseChunks', () => {
  it('parses chunk text using start and end anchors by default', () => {
    const result = reparseChunks(rawText, chunkDescriptors, 'anchors');

    expect(result.fallbackCount).toBe(0);
    expect(result.chunks[0].text).toBe('Alpha begins here and continues.\nAlpha still continues.');
    expect(result.chunks[1].text).toBe('Beta begins here and wraps up.\nBeta closing line.');
    expect(result.chunks[0].parseMode).toBe('anchors');
  });

  it('parses chunk text using line ranges when requested', () => {
    const result = reparseChunks(rawText, chunkDescriptors, 'lines');

    expect(result.fallbackCount).toBe(0);
    expect(result.chunks[0].text).toBe('Alpha begins here and continues.\nAlpha still continues.');
    expect(result.chunks[1].text).toBe('Beta begins here and wraps up.\nBeta closing line.');
    expect(result.chunks[1].parseMode).toBe('lines');
  });

  it('falls back to line parsing when anchor parsing fails', () => {
    const result = reparseChunks(rawText, [
      {
        ...chunkDescriptors[0],
        start: 'Missing anchor',
      },
    ], 'anchors');

    expect(result.fallbackCount).toBe(1);
    expect(result.chunks[0].text).toBe('Alpha begins here and continues.\nAlpha still continues.');
  });
});

describe('getChunkParseMode', () => {
  it('defaults to anchors when no chunks exist', () => {
    expect(getChunkParseMode([])).toBe('anchors');
  });

  it('treats legacy chunks without a parse mode as line-based', () => {
    expect(getChunkParseMode([{ parseMode: undefined }])).toBe('lines');
  });
});
