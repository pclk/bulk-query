'use client';

import { useEffect, useState } from 'react';
import { BarChart3, CircleDot, Settings2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { DEFAULT_CHUNK_PARSE_MODE, getChunkParseMode, reparseChunks } from '@/lib/chunk-parsing';
import { computeChunkStats, countWords, generateId, getSizeIndicator } from '@/lib/utils';
import type { Chunk, ChunkParseMode } from '@/lib/schemas/task';

interface ChunkReviewPanelProps {
  rawText: string;
  chunks: Chunk[];
  setChunks: (chunks: Chunk[]) => void;
  showToast: (message: string) => void;
}

function SizeIcon({ size }: { size: ReturnType<typeof getSizeIndicator> }) {
  const colors = {
    small: 'text-red-500',
    large: 'text-amber-500',
    good: 'text-emerald-500',
  };

  return <CircleDot size={20} className={colors[size]} />;
}

export default function ChunkReviewPanel({
  rawText,
  chunks,
  setChunks,
  showToast,
}: ChunkReviewPanelProps) {
  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);
  const [editingCtxId, setEditingCtxId] = useState<string | null>(null);
  const [editingCtxValue, setEditingCtxValue] = useState('');
  const [chunkParseMode, setChunkParseMode] = useState<ChunkParseMode>(() => getChunkParseMode(chunks));

  useEffect(() => {
    setChunkParseMode(getChunkParseMode(chunks));
  }, [chunks]);

  const handleParseModeChange = (nextParseMode: ChunkParseMode) => {
    setChunkParseMode(nextParseMode);

    if (chunks.length === 0 || nextParseMode === getChunkParseMode(chunks)) {
      return;
    }

    const { chunks: reparsedChunks, fallbackCount } = reparseChunks(rawText, chunks, nextParseMode);
    setChunks(reparsedChunks);
    showToast(
      fallbackCount > 0
        ? `Switched to ${nextParseMode === 'anchors' ? 'start/end' : 'line'} parsing with ${fallbackCount} line fallback${fallbackCount === 1 ? '' : 's'}`
        : `Switched to ${nextParseMode === 'anchors' ? 'start/end' : 'line'} parsing`
    );
  };

  const mergeChunks = () => {
    if (selectedChunks.length !== 2) {
      showToast('Please select exactly 2 adjacent chunks to merge');
      return;
    }

    const indices = selectedChunks
      .map((id) => chunks.findIndex((chunk) => chunk.id === id))
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
      text: `${chunk1.text}\n\n${chunk2.text}`,
      wordCount: chunk1.wordCount + chunk2.wordCount,
      parseMode: chunkParseMode,
      method: chunk1.method ?? chunk2.method,
    };

    const nextChunks = [...chunks];
    nextChunks.splice(indices[0], 2, merged);
    setChunks(nextChunks);
    setSelectedChunks([]);
    showToast('Chunks merged');
  };

  const splitChunk = (chunkId: string) => {
    const index = chunks.findIndex((chunk) => chunk.id === chunkId);
    const chunk = chunks[index];

    if (!chunk || chunk.wordCount < 100) {
      showToast('Chunk too small to split');
      return;
    }

    const words = chunk.text.split(/\s+/);
    const midpoint = Math.floor(words.length / 2);
    const text1 = words.slice(0, midpoint).join(' ');
    const text2 = words.slice(midpoint).join(' ');

    const chunk1: Chunk = {
      id: generateId(),
      title: `${chunk.title} (Part 1)`,
      start: chunk.start,
      end: text1.split(/\s+/).slice(-7).join(' '),
      lines: [chunk.lines[0], chunk.lines[0] + Math.floor((chunk.lines[1] - chunk.lines[0]) / 2)],
      ctx: chunk.ctx,
      text: text1,
      wordCount: countWords(text1),
      parseMode: chunkParseMode,
      method: chunk.method,
    };

    const chunk2: Chunk = {
      id: generateId(),
      title: `${chunk.title} (Part 2)`,
      start: text2.split(/\s+/).slice(0, 7).join(' '),
      end: chunk.end,
      lines: [chunk1.lines[1] + 1, chunk.lines[1]],
      ctx: `Continuation of ${chunk.title}`,
      text: text2,
      wordCount: countWords(text2),
      parseMode: chunkParseMode,
      method: chunk.method,
    };

    const nextChunks = [...chunks];
    nextChunks.splice(index, 1, chunk1, chunk2);
    setChunks(nextChunks);
    showToast('Chunk split');
  };

  const toggleChunkSelection = (chunkId: string) => {
    setSelectedChunks((prev) => (
      prev.includes(chunkId)
        ? prev.filter((id) => id !== chunkId)
        : [...prev, chunkId]
    ));
  };

  const updateChunkTitle = (chunkId: string, newTitle: string) => {
    setChunks(chunks.map((chunk) => (
      chunk.id === chunkId ? { ...chunk, title: newTitle } : chunk
    )));
  };

  const updateChunkCtx = (chunkId: string, newCtx: string) => {
    setChunks(chunks.map((chunk) => (
      chunk.id === chunkId ? { ...chunk, ctx: newCtx || null } : chunk
    )));
    setEditingCtxId(null);
    setEditingCtxValue('');
    showToast('Context updated');
  };

  const startEditingCtx = (chunk: Chunk) => {
    setEditingCtxId(chunk.id);
    setEditingCtxValue(chunk.ctx ?? '');
  };

  if (chunks.length === 0) {
    return null;
  }

  const stats = computeChunkStats(chunks);

  return (
    <div>
      <Card className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 size={18} className="text-accent" />
          <h3 className="text-base font-semibold text-gray-100">Chunk Parse Mode</h3>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Switch how chunk text is reconstructed from the source. Changing this updates the current chunks immediately.
        </p>
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          Chunk text parsing
          <select
            value={chunkParseMode}
            onChange={(e) => handleParseModeChange(e.target.value as ChunkParseMode)}
            className="rounded-lg border border-surface-lighter bg-surface-light p-3 text-gray-200 focus:outline-none"
          >
            <option value={DEFAULT_CHUNK_PARSE_MODE}>Start and end anchors</option>
            <option value="lines">Line ranges</option>
          </select>
        </label>
      </Card>

      <Card className="mb-6">
        <div className="mb-4 flex items-center gap-2">
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
            <div className="text-2xl font-bold text-gray-100">
              ~{(stats.estimatedInputTokens + stats.estimatedOutputTokens).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Est. Tokens (I/O)</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-[300px_1fr] gap-6">
        <div>
          <Card>
            <h3 className="mb-4 text-base font-semibold">Chunks ({chunks.length})</h3>
            <div className="mb-4 flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={mergeChunks}
                disabled={selectedChunks.length !== 2}
              >
                Merge
              </Button>
            </div>
            <div className="flex max-h-[600px] flex-col gap-2 overflow-y-auto">
              {chunks.map((chunk) => {
                const isSelected = selectedChunks.includes(chunk.id);
                const indicator = getSizeIndicator(chunk.wordCount);

                return (
                  <div
                    key={chunk.id}
                    className={`cursor-pointer rounded-md border-2 p-3 transition-colors ${
                      isSelected
                        ? 'border-accent bg-[#3a3a5a]'
                        : 'border-transparent bg-surface-light'
                    }`}
                    onClick={() => toggleChunkSelection(chunk.id)}
                  >
                    <div className="mb-1 flex items-center justify-between">
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
                      Split
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="mb-4 text-xl font-semibold text-gray-100">Review and Adjust Chunks</h2>
          <p className="mb-6 text-gray-400">
            Click chunks in the sidebar to select them. Select 2 adjacent chunks to merge, or split a chunk if it needs to be smaller.
          </p>

          <div className="mb-6">
            {chunks.map((chunk, index) => (
              <div key={chunk.id} className="mb-8">
                <div className="mb-2 flex items-center justify-between rounded-md bg-surface-light p-3">
                  <input
                    type="text"
                    value={chunk.title}
                    onChange={(e) => updateChunkTitle(chunk.id, e.target.value)}
                    className="flex-1 border-none bg-transparent text-base font-semibold text-gray-200 focus:outline-none"
                  />
                  <span className="flex items-center gap-2 text-sm text-gray-400">
                    {chunk.wordCount} words
                    <SizeIcon size={getSizeIndicator(chunk.wordCount)} />
                  </span>
                </div>

                {chunk.ctx && (
                  <div className="mb-2 rounded-md bg-[#1a2a3a] p-3 text-sm italic text-[#a0c0e0]">
                    Context:{' '}
                    {editingCtxId === chunk.id ? (
                      <input
                        type="text"
                        value={editingCtxValue}
                        onChange={(e) => setEditingCtxValue(e.target.value)}
                        onBlur={() => updateChunkCtx(chunk.id, editingCtxValue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCtxId(null);
                            setEditingCtxValue('');
                          }
                        }}
                        autoFocus
                        className="mt-1 w-full rounded border border-[#3a4a5a] bg-[#2a3a4a] px-2 py-1 text-gray-200 focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => startEditingCtx(chunk)}
                        className="cursor-pointer"
                      >
                        {chunk.ctx}
                      </span>
                    )}
                  </div>
                )}

                <div className="max-h-[200px] overflow-y-auto rounded-md bg-surface p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {chunk.text}
                </div>

                {index < chunks.length - 1 && (
                  <div className="relative my-6 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dark px-3 py-1 text-xs text-accent">
                      Next Chunk
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
