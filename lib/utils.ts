export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 11);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface WordCountStatus {
  status: 'low' | 'good';
  color: string;
  message: string;
}

export function getWordCountStatus(count: number): WordCountStatus {
  if (count < 1000) {
    return {
      status: 'low',
      color: 'text-amber-400',
      message: 'Under 1,000 words. A direct AI prompt may work better for text this short.',
    };
  }

  return { status: 'good', color: 'text-emerald-500', message: 'Recommended minimum reached' };
}

export type SizeIndicator = 'small' | 'large' | 'good';

export function getSizeIndicator(wordCount: number): SizeIndicator {
  if (wordCount < 500) return 'small';
  if (wordCount > 1500) return 'large';
  return 'good';
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~0.75 tokens per word for English text
  return Math.round(countWords(text) * 1.33);
}

interface CompletionState {
  rawText?: string | null;
  chunks?: unknown;
  taskPrompt?: string | null;
  results?: unknown;
}

export function computeCompletedStepCount({
  rawText,
  chunks,
  taskPrompt,
  results,
}: CompletionState): number {
  let completed = 0;

  if ((rawText ?? '').trim().length > 0) {
    completed += 1;
  }

  if (Array.isArray(chunks) && chunks.length > 0) {
    completed += 1;
  }

  if ((taskPrompt ?? '').trim().length > 0) {
    completed += 1;
  }

  if (Array.isArray(results) && results.length > 0) {
    completed += 1;
  }

  return completed;
}

export interface ChunkStats {
  count: number;
  totalWords: number;
  avgWords: number;
  minWords: number;
  maxWords: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export function computeChunkStats(chunks: { wordCount: number; text: string }[]): ChunkStats {
  if (chunks.length === 0) {
    return { count: 0, totalWords: 0, avgWords: 0, minWords: 0, maxWords: 0, estimatedInputTokens: 0, estimatedOutputTokens: 0 };
  }

  const wordCounts = chunks.map((c) => c.wordCount);
  const totalWords = wordCounts.reduce((sum, w) => sum + w, 0);
  const estimatedInputTokens = chunks.reduce((sum, c) => sum + estimateTokens(c.text), 0);

  return {
    count: chunks.length,
    totalWords,
    avgWords: Math.round(totalWords / chunks.length),
    minWords: Math.min(...wordCounts),
    maxWords: Math.max(...wordCounts),
    estimatedInputTokens,
    // Rough estimate: output tokens ~= input tokens for most tasks
    estimatedOutputTokens: estimatedInputTokens,
  };
}
