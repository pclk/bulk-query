import { describe, it, expect } from 'vitest';
import {
  templateSchema,
  taskPromptSchema,
  rawTextSchema,
  chunkRequestSchema,
  processRequestSchema,
} from '@/lib/schemas/task';

describe('templateSchema', () => {
  it('validates a correct template', () => {
    const result = templateSchema.safeParse({
      id: 'abc123',
      name: 'My Template',
      prompt: 'Do something',
    });
    expect(result.success).toBe(true);
  });

  it('rejects template with empty name', () => {
    const result = templateSchema.safeParse({
      id: 'abc123',
      name: '',
      prompt: 'Do something',
    });
    expect(result.success).toBe(false);
  });

  it('rejects template with empty prompt', () => {
    const result = templateSchema.safeParse({
      id: 'abc123',
      name: 'Name',
      prompt: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('taskPromptSchema', () => {
  it('validates a non-empty prompt', () => {
    const result = taskPromptSchema.safeParse('Translate this text');
    expect(result.success).toBe(true);
  });

  it('rejects an empty prompt', () => {
    const result = taskPromptSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('trims whitespace', () => {
    const result = taskPromptSchema.safeParse('  hello  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });
});

describe('rawTextSchema', () => {
  it('rejects text with fewer than 100 words', () => {
    const result = rawTextSchema.safeParse('only a few words here');
    expect(result.success).toBe(false);
  });

  it('accepts text with 100+ words', () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    const result = rawTextSchema.safeParse(words);
    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = rawTextSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('chunkRequestSchema', () => {
  it('validates correct chunk request', () => {
    const result = chunkRequestSchema.safeParse({
      text: 'Some text',
      taskPrompt: 'Summarize',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing text', () => {
    const result = chunkRequestSchema.safeParse({
      taskPrompt: 'Summarize',
    });
    expect(result.success).toBe(false);
  });
});

describe('processRequestSchema', () => {
  it('validates correct process request', () => {
    const result = processRequestSchema.safeParse({
      chunk: {
        id: '123',
        title: 'Section 1',
        start: 'first words',
        end: 'last words',
        lines: [1, 10],
        ctx: null,
        text: 'Some chunk text',
        wordCount: 3,
      },
      taskPrompt: 'Summarize',
    });
    expect(result.success).toBe(true);
  });
});
