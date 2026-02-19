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
  if (wordCount < 150) return 'small';
  if (wordCount > 750) return 'large';
  return 'good';
}
