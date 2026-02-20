export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface WordCountStatus {
  status: 'low' | 'high' | 'good';
  color: string;
  message: string;
}

export function getWordCountStatus(count: number): WordCountStatus {
  if (count < 1000) return { status: 'low', color: 'text-red-500', message: 'Below recommended range' };
  if (count > 6000) return { status: 'high', color: 'text-amber-500', message: 'Above recommended range' };
  return { status: 'good', color: 'text-emerald-500', message: 'Ideal range' };
}

export type SizeIndicator = 'small' | 'large' | 'good';

export function getSizeIndicator(wordCount: number): SizeIndicator {
  if (wordCount < 500) return 'small';
  if (wordCount > 1500) return 'large';
  return 'good';
}

export function estimateTokens(text: string): number {
  // Rough estimate: ~1.33 tokens per word for English text
  return Math.round(countWords(text) * 1.33);
}

// Anthropic model pricing (per million tokens)
export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-opus-4-6': { inputPerMTok: 15, outputPerMTok: 75 },
  'claude-haiku-4-5': { inputPerMTok: 0.80, outputPerMTok: 4 },
};

export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-6'];
  return (inputTokens / 1_000_000) * pricing.inputPerMTok + (outputTokens / 1_000_000) * pricing.outputPerMTok;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

export interface ChunkStats {
  count: number;
  totalWords: number;
  avgWords: number;
  minWords: number;
  maxWords: number;
  estimatedTokens: number;
}

export function computeChunkStats(chunks: { wordCount: number; text: string }[]): ChunkStats {
  if (chunks.length === 0) {
    return { count: 0, totalWords: 0, avgWords: 0, minWords: 0, maxWords: 0, estimatedTokens: 0 };
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
    // Combined input + output estimate (output assumed ≈ input for most tasks)
    estimatedTokens: estimatedInputTokens * 2,
  };
}
