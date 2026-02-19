import { describe, it, expect } from 'vitest';
import { generateId, countWords, getWordCountStatus, getSizeIndicator } from '@/lib/utils';

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
  it('returns small for word count under 150', () => {
    expect(getSizeIndicator(100)).toBe('small');
  });

  it('returns large for word count over 750', () => {
    expect(getSizeIndicator(800)).toBe('large');
  });

  it('returns good for word count between 150 and 750', () => {
    expect(getSizeIndicator(400)).toBe('good');
  });
});
