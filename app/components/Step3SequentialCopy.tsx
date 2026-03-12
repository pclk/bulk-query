'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyCheck,
  CheckCircle,
  Circle,
  ArrowRight,
  RotateCcw,
  Keyboard,
  Info,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { Chunk } from '@/lib/schemas/task';

interface Step3SequentialCopyProps {
  chunks: Chunk[];
  onBack: () => void;
  showToast: (message: string) => void;
}

export default function Step3SequentialCopy({
  chunks,
  onBack,
  showToast,
}: Step3SequentialCopyProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedSet, setCopiedSet] = useState<Set<number>>(new Set());
  const [justCopied, setJustCopied] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const activeChunkRef = useRef<HTMLDivElement>(null);
  const chunkListRef = useRef<HTMLDivElement>(null);

  const activeChunk = chunks[activeIndex];
  const allCopied = copiedSet.size === chunks.length;
  const copiedCount = copiedSet.size;

  // Auto-scroll left pane to keep active chunk visible
  useEffect(() => {
    if (activeChunkRef.current && chunkListRef.current) {
      const container = chunkListRef.current;
      const element = activeChunkRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      if (
        elementRect.top < containerRect.top ||
        elementRect.bottom > containerRect.bottom
      ) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const copyCurrentChunk = useCallback(() => {
    if (!activeChunk) return;

    let textToCopy = activeChunk.text;
    if (includeContext && activeChunk.ctx) {
      textToCopy = `[Context: ${activeChunk.ctx}]\n\n${activeChunk.text}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedSet((prev) => new Set(prev).add(activeIndex));
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1200);
    showToast(`Chunk ${activeIndex + 1} copied!`);
  }, [activeChunk, activeIndex, includeContext, showToast]);

  const goNext = useCallback(() => {
    if (activeIndex < chunks.length - 1) {
      setActiveIndex((prev) => prev + 1);
    }
  }, [activeIndex, chunks.length]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  }, [activeIndex]);

  const copyAndNext = useCallback(() => {
    copyCurrentChunk();
    // Small delay so the user sees the copy feedback before advancing
    setTimeout(() => {
      if (activeIndex < chunks.length - 1) {
        setActiveIndex((prev) => prev + 1);
      }
    }, 300);
  }, [copyCurrentChunk, activeIndex, chunks.length]);

  const resetProgress = () => {
    setCopiedSet(new Set());
    setActiveIndex(0);
    showToast('Progress reset');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'j':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'k':
          e.preventDefault();
          goPrev();
          break;
        case 'c':
          e.preventDefault();
          copyCurrentChunk();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          copyAndNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, copyCurrentChunk, copyAndNext]);

  if (chunks.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-gray-400">No chunks available. Go back to chunk your text first.</p>
        <Button variant="secondary" onClick={onBack} className="mt-4">
          &larr; Back to Chunking
        </Button>
      </Card>
    );
  }

  return (
    <div>
      {/* Info banner */}
      <div className="mb-4 p-4 bg-[#1a2a3a] border border-[#2a3a5a] rounded-lg">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-[#a0c0e0] mt-0.5 shrink-0" />
          <div className="text-sm text-[#a0c0e0]">
            <strong>Sequential Copy</strong> lets you walk through your chunks one at a time and
            copy each to your clipboard &mdash; perfect for pasting into your preferred AI chatbot
            (ChatGPT, Gemini, Claude, etc.) without needing an API key for processing.
            The API key is still required for the initial chunking step.
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">
            {copiedCount} of {chunks.length} chunks copied
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="rounded bg-surface-light border-surface-lighter accent-accent"
              />
              Include context preamble
            </label>
            <button
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              onClick={() => setShowShortcuts(!showShortcuts)}
            >
              <Keyboard size={12} />
              Shortcuts
            </button>
          </div>
        </div>
        <div className="w-full h-2 bg-surface-light rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-purple transition-all duration-500"
            style={{ width: `${(copiedCount / chunks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Keyboard shortcuts tooltip */}
      {showShortcuts && (
        <div className="mb-4 p-4 bg-surface rounded-lg border border-surface-lighter text-sm">
          <div className="grid grid-cols-2 gap-2 text-gray-400 max-w-md">
            <div><kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs">Space</kbd> / <kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs">Enter</kbd></div>
            <div>Copy &amp; Next</div>
            <div><kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs">C</kbd></div>
            <div>Copy only</div>
            <div><kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs">&rarr;</kbd> / <kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs">J</kbd></div>
            <div>Next chunk</div>
            <div><kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs">&larr;</kbd> / <kbd className="px-1.5 py-0.5 bg-surface-light rounded text-xs">K</kbd></div>
            <div>Previous chunk</div>
          </div>
        </div>
      )}

      {/* Completion banner */}
      {allCopied && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <CheckCircle size={18} />
            <span>All {chunks.length} chunks copied! You can navigate back to re-copy any chunk.</span>
          </div>
          <Button size="small" variant="secondary" onClick={resetProgress}>
            <span className="flex items-center gap-1">
              <RotateCcw size={14} />
              Reset
            </span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[280px_1fr] gap-4">
        {/* Left pane: Chunk list */}
        <Card className="p-0 overflow-hidden">
          <div className="p-3 border-b border-surface-lighter">
            <h3 className="text-sm font-semibold text-gray-300">Chunks ({chunks.length})</h3>
          </div>
          <div
            ref={chunkListRef}
            className="flex flex-col gap-0 max-h-[600px] overflow-y-auto"
          >
            {chunks.map((chunk, index) => {
              const isActive = index === activeIndex;
              const isCopied = copiedSet.has(index);

              return (
                <div
                  key={chunk.id}
                  ref={isActive ? activeChunkRef : null}
                  className={`px-3 py-3 cursor-pointer border-l-4 transition-all ${
                    isActive
                      ? 'bg-accent/15 border-l-accent'
                      : isCopied
                        ? 'bg-emerald-500/5 border-l-emerald-500/50 hover:bg-emerald-500/10'
                        : 'bg-transparent border-l-transparent hover:bg-surface-light'
                  }`}
                  onClick={() => setActiveIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">
                      {isCopied ? (
                        <CheckCircle size={14} className="text-emerald-500" />
                      ) : isActive ? (
                        <ArrowRight size={14} className="text-accent" />
                      ) : (
                        <Circle size={14} className="text-gray-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {chunk.title}
                      </div>
                      <div className="text-xs text-gray-500">{chunk.wordCount} words</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right pane: Active chunk */}
        <Card>
          {/* Chunk header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Chunk {activeIndex + 1} of {chunks.length}
              </div>
              <h3 className="text-lg font-semibold text-gray-100">
                {activeChunk.title}
              </h3>
            </div>
            {copiedSet.has(activeIndex) && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                <CheckCircle size={12} />
                Copied
              </span>
            )}
          </div>

          {/* Context preamble */}
          {activeChunk.ctx && (
            <div className="p-3 bg-[#1a2a3a] rounded-md mb-4 text-sm italic text-[#a0c0e0]">
              Context: {activeChunk.ctx}
            </div>
          )}

          {/* Chunk text */}
          <div className="p-4 bg-surface rounded-md font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto mb-6 border border-surface-lighter">
            {activeChunk.text}
          </div>

          {/* Navigation + Copy controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={goPrev}
              disabled={activeIndex === 0}
            >
              <span className="flex items-center gap-1">
                <ChevronLeft size={16} />
                Previous
              </span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={copyCurrentChunk}
              >
                <span className="flex items-center gap-1">
                  {justCopied ? <CopyCheck size={16} /> : <Copy size={16} />}
                  {justCopied ? 'Copied!' : 'Copy'}
                </span>
              </Button>

              <Button onClick={copyAndNext}>
                <span className="flex items-center gap-1">
                  <Copy size={16} />
                  Copy &amp; Next
                  <ArrowRight size={16} />
                </span>
              </Button>
            </div>

            <Button
              variant="secondary"
              onClick={goNext}
              disabled={activeIndex === chunks.length - 1}
            >
              <span className="flex items-center gap-1">
                Next
                <ChevronRight size={16} />
              </span>
            </Button>
          </div>

          {/* Peek at next chunk */}
          {activeIndex < chunks.length - 1 && (
            <div className="mt-6 pt-4 border-t border-surface-lighter">
              <div className="text-xs text-gray-500 mb-2">Up next: {chunks[activeIndex + 1].title}</div>
              <div className="text-xs text-gray-600 line-clamp-2">
                {chunks[activeIndex + 1].text.slice(0, 200)}...
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Footer navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={onBack}>
          &larr; Back
        </Button>
      </div>
    </div>
  );
}
