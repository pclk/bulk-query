import { z } from 'zod';

export const templateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Template name is required'),
  prompt: z.string().min(1, 'Prompt is required'),
});

export type Template = z.infer<typeof templateSchema>;

export const taskPromptSchema = z.string().min(1, 'Task prompt is required').trim();

export const rawTextSchema = z
  .string()
  .min(1, 'Text is required')
  .refine(
    (text) => text.trim().split(/\s+/).filter(Boolean).length >= 100,
    { message: 'Text must contain at least 100 words' }
  );

export const chunkParseModeSchema = z.enum(['anchors', 'lines']);
export const chunkingMethodSchema = z.enum(['api', 'prompt', 'paragraph']);

export const chunkSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  lines: z.tuple([z.number(), z.number()]),
  ctx: z.string().nullable(),
  text: z.string(),
  wordCount: z.number(),
  parseMode: chunkParseModeSchema.optional(),
  method: chunkingMethodSchema.optional(),
});

export type Chunk = z.infer<typeof chunkSchema>;
export type ChunkParseMode = NonNullable<Chunk['parseMode']>;
export type ChunkingMethod = z.infer<typeof chunkingMethodSchema>;

export const chunkingStrategySchema = z.enum(['count', 'range']);

export const chunkingOptionsSchema = z.object({
  strategy: chunkingStrategySchema.default('range'),
  targetChunkCount: z.number().int().min(2).max(100).optional(),
  minChunkWords: z.number().int().min(100).max(10000).optional(),
  maxChunkWords: z.number().int().min(100).max(10000).optional(),
}).superRefine((value, ctx) => {
  if (value.strategy === 'count' && typeof value.targetChunkCount !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetChunkCount'],
      message: 'Target chunk count is required when using count mode',
    });
  }

  if (value.strategy === 'range') {
    const minChunkWords = value.minChunkWords ?? 750;
    const maxChunkWords = value.maxChunkWords ?? 1500;

    if (minChunkWords >= maxChunkWords) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxChunkWords'],
        message: 'Maximum chunk words must be greater than minimum chunk words',
      });
    }
  }
});

export type ChunkingOptions = z.infer<typeof chunkingOptionsSchema>;

export interface ResolvedChunkingOptions {
  strategy: 'count' | 'range';
  targetChunkCount?: number;
  minChunkWords?: number;
  maxChunkWords?: number;
}

export function resolveChunkingOptions(chunking?: ChunkingOptions): ResolvedChunkingOptions {
  if (chunking?.strategy === 'count') {
    return {
      strategy: 'count',
      targetChunkCount: chunking.targetChunkCount ?? 6,
    };
  }

  return {
    strategy: 'range',
    minChunkWords: chunking?.minChunkWords ?? 750,
    maxChunkWords: chunking?.maxChunkWords ?? 1500,
  };
}

export const chunkRequestSchema = z.object({
  text: z.string().min(1),
  chunking: chunkingOptionsSchema.optional(),
});

export const processRequestSchema = z.object({
  chunk: chunkSchema,
  taskPrompt: z.string().min(1),
});

export const processingResultSchema = z.object({
  chunkId: z.string(),
  status: z.enum(['pending', 'processing', 'complete', 'error']),
  output: z.string().nullable(),
});

export type ProcessingResult = z.infer<typeof processingResultSchema>;

export interface ProjectSummary {
  id: string;
  name: string;
  taskPrompt: string;
  processingMode: string;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  taskPrompt: string;
  processingMode: string;
  createdAt: string;
  updatedAt: string;
  rawText: string;
  chunks: Chunk[];
  results: ProcessingResult[] | null;
}

export type AuthMode = 'account' | 'guest';
