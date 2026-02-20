'use client';

import { useState, useEffect } from 'react';
import { Scissors, Merge, CircleDot, BarChart3 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { generateId, countWords, getSizeIndicator, computeChunkStats } from '@/lib/utils';
import { getStoredApiKey, getStoredModel } from './ApiKeySettings';
import type { Chunk } from '@/lib/schemas/task';

interface Step3Props {
  rawText: string;
  taskPrompt: string;
  chunks: Chunk[];
  setChunks: React.Dispatch<React.SetStateAction<Chunk[]>>;
  isChunking: boolean;
  setIsChunking: (value: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  showToast: (message: string, error?: unknown) => void;
}

function SizeIcon({ size }: { size: ReturnType<typeof getSizeIndicator> }) {
  const colors = {
    small: 'text-red-500',
    large: 'text-amber-500',
    good: 'text-emerald-500',
  };

  return <CircleDot size={20} className={colors[size]} />;
}

export default function Step3Chunking({
  rawText,
  taskPrompt,
  chunks,
  setChunks,
  isChunking,
  setIsChunking,
  onNext,
  onBack,
  showToast,
}: Step3Props) {
  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);
  const [editingCtx, setEditingCtx] = useState<string | null>(null);

  const performChunking = async () => {
    setIsChunking(true);
    showToast('Analyzing text and creating chunks...');

    const apiKey = getStoredApiKey();
    const model = getStoredModel();

    try {
      const res = await fetch('/api/chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey, 'x-model': model } : {}),
        },
        body: JSON.stringify({ text: rawText, taskPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Chunking failed');
      }

      setChunks(data.chunks);
      showToast(`Created ${data.chunks.length} chunks`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Chunking failed', err);
    } finally {
      setIsChunking(false);
    }
  };

  useEffect(() => {
    if (chunks.length === 0 && !isChunking) {
      performChunking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergeChunks = () => {
    if (selectedChunks.length !== 2) {
      showToast('Please select exactly 2 adjacent chunks to merge');
      return;
    }

    const indices = selectedChunks
      .map((id) => chunks.findIndex((c) => c.id === id))
      .sort((a, b) => a - b);

    if (indices[1] - indices[0] !== 1) {
      showToast('Can only merge adjacent chunks');
      return;
    }

    const chunk1 = chunks[indices[0]];
    const chunk2 = chunks[indices[1]];

    const merged: Chunk = {
      id: generateId(),
      title: chunk1.title,
      start: chunk1.start,
      end: chunk2.end,
      lines: [chunk1.lines[0], chunk2.lines[1]],
      ctx: chunk1.ctx,
      text: chunk1.text + '\n\n' + chunk2.text,
      wordCount: chunk1.wordCount + chunk2.wordCount,
    };

    const newChunks = [...chunks];
    newChunks.splice(indices[0], 2, merged);
    setChunks(newChunks);
    setSelectedChunks([]);
    showToast('Chunks merged');
  };

  const splitChunk = (chunkId: string) => {
    const index = chunks.findIndex((c) => c.id === chunkId);
    const chunk = chunks[index];

    if (chunk.wordCount < 100) {
      showToast('Chunk too small to split');
      return;
    }

    const words = chunk.text.split(/\s+/);
    const midPoint = Math.floor(words.length / 2);
    const text1 = words.slice(0, midPoint).join(' ');
    const text2 = words.slice(midPoint).join(' ');

    const chunk1: Chunk = {
      id: generateId(),
      title: chunk.title + ' (Part 1)',
      start: chunk.start,
      end: text1.split(/\s+/).slice(-7).join(' '),
      lines: [chunk.lines[0], chunk.lines[0] + Math.floor((chunk.lines[1] - chunk.lines[0]) / 2)],
      ctx: chunk.ctx,
      text: text1,
      wordCount: countWords(text1),
    };

    const chunk2: Chunk = {
      id: generateId(),
      title: chunk.title + ' (Part 2)',
      start: text2.split(/\s+/).slice(0, 7).join(' '),
      end: chunk.end,
      lines: [chunk1.lines[1] + 1, chunk.lines[1]],
      ctx: 'Continuation of ' + chunk.title,
      text: text2,
      wordCount: countWords(text2),
    };

    const newChunks = [...chunks];
    newChunks.splice(index, 1, chunk1, chunk2);
    setChunks(newChunks);
    showToast('Chunk split');
  };

  const toggleChunkSelection = (chunkId: string) => {
    setSelectedChunks((prev) =>
      prev.includes(chunkId) ? prev.filter((id) => id !== chunkId) : [...prev, chunkId]
    );
  };

  const updateChunkTitle = (chunkId: string, newTitle: string) => {
    setChunks((prev) => prev.map((c) => (c.id === chunkId ? { ...c, title: newTitle } : c)));
  };

  const updateChunkCtx = (chunkId: string, newCtx: string) => {
    setChunks((prev) => prev.map((c) => (c.id === chunkId ? { ...c, ctx: newCtx || null } : c)));
    setEditingCtx(null);
    showToast('Context updated');
  };

  const handleNext = () => {
    if (chunks.length === 0) {
      showToast('No chunks available');
      return;
    }
    onNext();
  };

  if (isChunking) {
    return (
      <div>
        <Card className="text-center py-12">
          <div className="text-5xl mb-4">
            <Scissors size={48} className="mx-auto text-accent" />
          </div>
          <h2 className="text-xl font-semibold">Analyzing text...</h2>
          <p className="text-gray-400 mt-2">Creating semantic chunks</p>
        </Card>
      </div>
    );
  }

  const stats = computeChunkStats(chunks);

  return (
    <div>
      {/* Summary Statistics */}
      {chunks.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-accent" />
            <h3 className="text-base font-semibold">Chunk Statistics</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-100">{stats.count}</div>
              <div className="text-xs text-gray-400">Chunks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-100">{stats.totalWords.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Total Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-100">{stats.avgWords.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Avg Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-100">{stats.minWords.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Min Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-100">{stats.maxWords.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Max Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-100">~{(stats.estimatedInputTokens + stats.estimatedOutputTokens).toLocaleString()}</div>
              <div className="text-xs text-gray-400">Est. Tokens (I/O)</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-[300px_1fr] gap-6">
        {/* Chunk Sidebar */}
        <div>
          <Card>
            <h3 className="text-base font-semibold mb-4">Chunks ({chunks.length})</h3>
            <div className="flex gap-2 mb-4">
              <Button
                variant="secondary"
                size="small"
                onClick={mergeChunks}
                disabled={selectedChunks.length !== 2}
              >
                <span className="flex items-center gap-1">
                  <Merge size={14} />
                  Merge
                </span>
              </Button>
            </div>
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
              {chunks.map((chunk) => {
                const isSelected = selectedChunks.includes(chunk.id);
                const indicator = getSizeIndicator(chunk.wordCount);

                return (
                  <div
                    key={chunk.id}
                    className={`p-3 rounded-md cursor-pointer border-2 transition-colors ${
                      isSelected
                        ? 'bg-[#3a3a5a] border-accent'
                        : 'bg-surface-light border-transparent'
                    }`}
                    onClick={() => toggleChunkSelection(chunk.id)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold">{chunk.title}</span>
                      <SizeIcon size={indicator} />
                    </div>
                    <div className="text-xs text-gray-400">{chunk.wordCount} words</div>
                    <Button
                      variant="secondary"
                      size="small"
                      className="mt-2 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        splitChunk(chunk.id);
                      }}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Scissors size={14} />
                        Split
                      </span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Main Content Area */}
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Review & Adjust Chunks</h2>
          <p className="mb-6 text-gray-400">
            Click chunks in the sidebar to select them. Select 2 adjacent chunks to merge, or click
            Split to divide a chunk.
          </p>

          <div className="mb-6">
            {chunks.map((chunk, index) => (
              <div key={chunk.id} className="mb-8">
                <div className="flex justify-between items-center mb-2 p-3 bg-surface-light rounded-md">
                  <input
                    type="text"
                    value={chunk.title}
                    onChange={(e) => updateChunkTitle(chunk.id, e.target.value)}
                    className="bg-transparent border-none text-gray-200 text-base font-semibold flex-1 focus:outline-none"
                  />
                  <span className="text-sm text-gray-400 flex items-center gap-2">
                    {chunk.wordCount} words
                    <SizeIcon size={getSizeIndicator(chunk.wordCount)} />
                  </span>
                </div>

                {chunk.ctx && (
                  <div className="p-3 bg-[#1a2a3a] rounded-md mb-2 text-sm italic text-[#a0c0e0]">
                    Context:{' '}
                    {editingCtx === chunk.id ? (
                      <input
                        type="text"
                        value={chunk.ctx}
                        onChange={(e) => updateChunkCtx(chunk.id, e.target.value)}
                        onBlur={() => setEditingCtx(null)}
                        autoFocus
                        className="bg-[#2a3a4a] border border-[#3a4a5a] text-gray-200 px-2 py-1 rounded w-full mt-1 focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => setEditingCtx(chunk.id)}
                        className="cursor-pointer"
                      >
                        {chunk.ctx}
                      </span>
                    )}
                  </div>
                )}

                <div className="p-4 bg-surface rounded-md font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {chunk.text}
                </div>

                {index < chunks.length - 1 && (
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent my-6 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dark px-3 py-1 text-xs text-accent">
                      CHUNK BREAK
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={onBack}>
              &larr; Back
            </Button>
            <Button onClick={handleNext}>Next &rarr;</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
