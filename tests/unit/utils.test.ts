import { describe, it, expect } from 'vitest';
import { generateId, countWords, getWordCountStatus, getSizeIndicator, estimateTokens, computeChunkStats } from '@/lib/utils';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('countWords', () => {
  it('counts words in a normal sentence', () => {
    expect(countWords('hello world foo bar')).toBe(4);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('one   two   three')).toBe(3);
  });

  it('handles newlines', () => {
    expect(countWords('one\ntwo\nthree')).toBe(3);
  });
});

describe('getWordCountStatus', () => {
  it('returns low for counts below 1000', () => {
    expect(getWordCountStatus(500).status).toBe('low');
  });

  it('returns good for counts between 1000 and 6000', () => {
    expect(getWordCountStatus(3000).status).toBe('good');
  });

  it('returns high for counts above 6000', () => {
    expect(getWordCountStatus(7000).status).toBe('high');
  });

  it('returns good at exactly 1000', () => {
    expect(getWordCountStatus(1000).status).toBe('good');
  });

  it('returns good at exactly 6000', () => {
    expect(getWordCountStatus(6000).status).toBe('good');
  });
});

describe('getSizeIndicator', () => {
  it('returns small for word count under 500', () => {
    expect(getSizeIndicator(300)).toBe('small');
  });

  it('returns large for word count over 1500', () => {
    expect(getSizeIndicator(1600)).toBe('large');
  });

  it('returns good for word count between 500 and 1500', () => {
    expect(getSizeIndicator(1000)).toBe('good');
  });
});

describe('estimateTokens', () => {
  it('estimates tokens for a given text', () => {
    const text = 'hello world foo bar';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    // 4 words * 1.33 ≈ 5
    expect(tokens).toBe(5);
  });

  it('returns 0 for empty text', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('computeChunkStats', () => {
  it('computes stats for multiple chunks', () => {
    const chunks = [
      { wordCount: 100, text: Array(100).fill('word').join(' ') },
      { wordCount: 200, text: Array(200).fill('word').join(' ') },
      { wordCount: 300, text: Array(300).fill('word').join(' ') },
    ];
    const stats = computeChunkStats(chunks);
    expect(stats.count).toBe(3);
    expect(stats.totalWords).toBe(600);
    expect(stats.avgWords).toBe(200);
    expect(stats.minWords).toBe(100);
    expect(stats.maxWords).toBe(300);
    expect(stats.estimatedInputTokens).toBeGreaterThan(0);
  });

  it('returns zeroes for empty array', () => {
    const stats = computeChunkStats([]);
    expect(stats.count).toBe(0);
    expect(stats.totalWords).toBe(0);
    expect(stats.avgWords).toBe(0);
  });
});
