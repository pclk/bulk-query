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

export const chunkSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  lines: z.tuple([z.number(), z.number()]),
  ctx: z.string().nullable(),
  text: z.string(),
  wordCount: z.number(),
});

export type Chunk = z.infer<typeof chunkSchema>;

export const chunkRequestSchema = z.object({
  text: z.string().min(1),
  taskPrompt: z.string().min(1),
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
