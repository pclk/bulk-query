'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Info, Play, RotateCcw, Scissors } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import ChunkReviewPanel from './ChunkReviewPanel';
import { getStoredApiKey, getStoredModel } from './ApiKeySettings';
import {
  buildPromptChunkingInput,
  paragraphChunking,
  parseChunkManifestResponse,
} from '@/lib/chunking';
import { countWords } from '@/lib/utils';
import { resolveChunkingOptions, type Chunk } from '@/lib/schemas/task';

type ChunkingSubStep = '2a' | '2b' | '2c';

interface Step3Props {
  rawText: string;
  chunks: Chunk[];
  setChunks: (chunks: Chunk[]) => void;
  isChunking: boolean;
  setIsChunking: (value: boolean) => void;
  chunkingSubStep: ChunkingSubStep;
  setChunkingSubStep: (value: ChunkingSubStep) => void;
  onNext: () => void;
  onBack: () => void;
  showToast: (message: string) => void;
}

export default function Step3Chunking({
  rawText,
  chunks,
  setChunks,
  isChunking,
  setIsChunking,
  chunkingSubStep,
  setChunkingSubStep,
  onNext,
  onBack,
  showToast,
}: Step3Props) {
  const [chunkingStrategy, setChunkingStrategy] = useState<'count' | 'range'>('range');
  const [targetChunkCount, setTargetChunkCount] = useState(() =>
    Math.max(2, Math.ceil(countWords(rawText) / 1200))
  );
  const [minChunkWords, setMinChunkWords] = useState(750);
  const [maxChunkWords, setMaxChunkWords] = useState(1500);
  const [promptResponse, setPromptResponse] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);
  const lastParagraphKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setTargetChunkCount(Math.max(2, Math.ceil(countWords(rawText) / 1200)));
  }, [rawText]);

  const chunkingOptions = useMemo(() => (
    chunkingStrategy === 'count'
      ? {
          strategy: 'count' as const,
          targetChunkCount,
        }
      : {
          strategy: 'range' as const,
          minChunkWords,
          maxChunkWords,
        }
  ), [chunkingStrategy, maxChunkWords, minChunkWords, targetChunkCount]);

  const promptText = useMemo(
    () => buildPromptChunkingInput(rawText, chunkingOptions),
    [chunkingOptions, rawText]
  );

  const autoParagraphChunks = useMemo(
    () => paragraphChunking(rawText, resolveChunkingOptions(chunkingOptions)),
    [chunkingOptions, rawText]
  );

  useEffect(() => {
    if (!rawText.trim()) {
      return;
    }

    const shouldAutoApply = chunkingSubStep === '2c' || chunks.length === 0;
    if (!shouldAutoApply) {
      return;
    }

    const nextKey = JSON.stringify({
      rawText,
      chunkingOptions,
      paragraphChunks: autoParagraphChunks.map((chunk) => ({
        title: chunk.title,
        start: chunk.start,
        end: chunk.end,
        lines: chunk.lines,
        text: chunk.text,
      })),
    });

    if (nextKey === lastParagraphKeyRef.current) {
      return;
    }

    lastParagraphKeyRef.current = nextKey;
    setChunks(autoParagraphChunks);
  }, [autoParagraphChunks, chunkingOptions, chunkingSubStep, chunks.length, rawText, setChunks]);

  const performApiChunking = async () => {
    if (chunkingStrategy === 'count' && targetChunkCount < 2) {
      showToast('Choose at least 2 chunks');
      return;
    }

    if (chunkingStrategy === 'range' && minChunkWords >= maxChunkWords) {
      showToast('Maximum chunk words must be greater than the minimum');
      return;
    }

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      showToast('API chunking requires an Anthropic API key');
      return;
    }

    setIsChunking(true);
    setPromptError(null);
    showToast('Running API chunking...');

    try {
      const res = await fetch('/api/chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-model': getStoredModel(),
        },
        body: JSON.stringify({
          text: rawText,
          chunking: chunkingOptions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Chunking failed');
      }

      setChunks(data.chunks);
      setChunkingSubStep('2a');
      showToast(`Created ${data.chunks.length} API chunks`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Chunking failed');
    } finally {
      setIsChunking(false);
    }
  };

  const applyPromptChunks = () => {
    if (!promptResponse.trim()) {
      showToast('Paste your chatbot output first');
      return;
    }

    try {
      const nextChunks = parseChunkManifestResponse(rawText, promptResponse, 'prompt');
      setChunks(nextChunks);
      setPromptError(null);
      setChunkingSubStep('2b');
      showToast(`Applied ${nextChunks.length} prompt chunks`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse chatbot output';
      setPromptError(message);
      showToast(message);
    }
  };

  const copyPromptText = async () => {
    await navigator.clipboard.writeText(promptText);
    showToast('Prompt chunking input copied');
  };

  const handleNext = () => {
    if (chunks.length === 0) {
      showToast('Run or apply a chunking method first');
      return;
    }

    onNext();
  };

  const subStepLabel = {
    '2a': 'API chunking',
    '2b': 'Prompt chunking',
    '2c': 'Paragraph chunking',
  }[chunkingSubStep];
  const activeChunkLabel = chunks[0]?.method
    ? {
        api: 'API chunking',
        prompt: 'Prompt chunking',
        paragraph: 'Paragraph chunking',
      }[chunks[0].method]
    : null;

  if (isChunking) {
    return (
      <div>
        <Card className="py-12 text-center">
          <div className="mb-4 text-5xl">
            <Scissors size={48} className="mx-auto text-accent" />
          </div>
          <h2 className="text-xl font-semibold">Analyzing text...</h2>
          <p className="mt-2 text-gray-400">Creating semantic chunks with your selected settings</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Scissors size={18} className="text-accent" />
          <h2 className="text-xl font-semibold text-gray-100">Chunking</h2>
        </div>
        <p className="mb-6 text-gray-400">
          Configure your chunk sizing once, then choose how to generate chunks. <strong>{subStepLabel}</strong> is currently active.
        </p>
        {activeChunkLabel && activeChunkLabel !== subStepLabel && (
          <div className="mb-6 rounded-lg border border-surface-lighter bg-surface-light p-4 text-sm text-gray-300">
            Current reviewed chunks are from <strong>{activeChunkLabel}</strong>. Switch to that sub-step or generate/apply new chunks here to replace them.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Chunking mode
            <select
              value={chunkingStrategy}
              onChange={(e) => setChunkingStrategy(e.target.value as 'count' | 'range')}
              className="rounded-lg border border-surface-lighter bg-surface-light p-3 text-gray-200 focus:outline-none"
            >
              <option value="range">Set by chunk length range</option>
              <option value="count">Set by amount of chunks</option>
            </select>
          </label>

          {chunkingStrategy === 'count' ? (
            <label className="flex flex-col gap-2 text-sm text-gray-300">
              Target chunk count
              <input
                type="number"
                min={2}
                max={100}
                value={targetChunkCount}
                onChange={(e) => setTargetChunkCount(Math.max(2, Number(e.target.value) || 2))}
                className="rounded-lg border border-surface-lighter bg-surface-light p-3 text-gray-200 focus:outline-none"
              />
            </label>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-gray-300">
                Minimum words
                <input
                  type="number"
                  min={100}
                  max={10000}
                  value={minChunkWords}
                  onChange={(e) => setMinChunkWords(Math.max(100, Number(e.target.value) || 100))}
                  className="rounded-lg border border-surface-lighter bg-surface-light p-3 text-gray-200 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-gray-300">
                Maximum words
                <input
                  type="number"
                  min={200}
                  max={10000}
                  value={maxChunkWords}
                  onChange={(e) => setMaxChunkWords(Math.max(200, Number(e.target.value) || 200))}
                  className="rounded-lg border border-surface-lighter bg-surface-light p-3 text-gray-200 focus:outline-none"
                />
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            &larr; Back
          </Button>
          <div className="flex items-center gap-3">
            {chunkingSubStep === '2a' && (
              <Button onClick={performApiChunking}>
                <span className="flex items-center gap-2">
                  {chunks[0]?.method === 'api' ? <RotateCcw size={16} /> : <Play size={16} />}
                  {chunks[0]?.method === 'api' ? 'Run API Again' : 'Run API Chunking'}
                </span>
              </Button>
            )}
            <Button onClick={handleNext}>
              Continue &rarr;
            </Button>
          </div>
        </div>
      </Card>

      {chunkingSubStep === '2b' && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <Copy size={18} className="text-accent" />
            <h3 className="text-lg font-semibold text-gray-100">2b. Prompt Chunking</h3>
          </div>
          <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            This is auto-generated because it costs no API calls. Copy the prompt below into your preferred chatbot, then paste the chatbot output back here.
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Copyable chunking input</label>
              <Button variant="secondary" size="small" onClick={copyPromptText}>
                <span className="flex items-center gap-2">
                  <Copy size={14} />
                  Copy
                </span>
              </Button>
            </div>
            <Textarea value={promptText} readOnly className="min-h-[260px]" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Paste chatbot output
            </label>
            <Textarea
              value={promptResponse}
              onChange={(e) => setPromptResponse(e.target.value)}
              placeholder="Paste the JSON chunk manifest returned by your chatbot here."
              className="min-h-[220px]"
            />
            {promptError && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {promptError}
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={applyPromptChunks}>Apply Chatbot Output</Button>
              {chunks[0]?.method === 'prompt' && (
                <span className="text-sm text-emerald-400">Prompt chunks are currently active.</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {chunkingSubStep === '2c' && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <Info size={18} className="text-accent" />
            <h3 className="text-lg font-semibold text-gray-100">2c. Paragraph Chunking</h3>
          </div>
          <div className="mb-4 rounded-lg border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
            This is the paragraph-based fallback. It auto-runs because it costs no API calls.
          </div>
          <p className="text-gray-400">
            The current chunks were built by grouping paragraphs into the size target above. Changing the sizing settings here will regenerate them automatically.
          </p>
        </Card>
      )}

      {chunks.length > 0 && (
        <ChunkReviewPanel
          rawText={rawText}
          chunks={chunks}
          setChunks={setChunks}
          showToast={showToast}
        />
      )}
    </div>
  );
}
