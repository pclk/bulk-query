'use client';

import { useState, useEffect } from 'react';
import { Copy, RefreshCw, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { Chunk, ProcessingResult } from '@/lib/schemas/task';

interface Step4Props {
  chunks: Chunk[];
  taskPrompt: string;
  processingMode: string;
  setProcessingMode: (mode: string) => void;
  results: ProcessingResult[];
  setResults: React.Dispatch<React.SetStateAction<ProcessingResult[]>>;
  onBack: () => void;
  showToast: (message: string) => void;
}

export default function Step4Processing({
  chunks,
  taskPrompt,
  processingMode,
  setProcessingMode,
  results,
  setResults,
  onBack,
  showToast,
}: Step4Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState(0);

  const processChunk = async (chunk: Chunk): Promise<string> => {
    // Simulate API delay (in real app, this would call /api/process)
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    let output = chunk.text;

    if (taskPrompt.toLowerCase().includes('flashcard')) {
      const sentences = chunk.text.split(/[.!?]+/).filter((s) => s.trim());
      output = sentences
        .slice(0, 3)
        .map((s, i) => {
          const q = `What is discussed in sentence ${i + 1}?`;
          const a = s.trim();
          return `${q};${a}`;
        })
        .join('\n');
    } else if (taskPrompt.toLowerCase().includes('summarize')) {
      const words = chunk.text.split(/\s+/);
      output = `Summary: ${words.slice(0, Math.min(50, words.length)).join(' ')}...`;
    } else if (taskPrompt.toLowerCase().includes('bullet')) {
      const sentences = chunk.text.split(/[.!?]+/).filter((s) => s.trim());
      output = sentences.map((s) => `- ${s.trim()}`).join('\n');
    } else {
      output = `[Processed with: ${taskPrompt}]\n\n${chunk.text}`;
    }

    return output;
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setCurrentProcessing(0);

    const initialResults: ProcessingResult[] = chunks.map((chunk) => ({
      chunkId: chunk.id,
      status: 'pending',
      output: null,
    }));
    setResults(initialResults);

    if (processingMode === 'sequential') {
      for (let i = 0; i < chunks.length; i++) {
        setCurrentProcessing(i + 1);
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'processing' } : r))
        );

        try {
          const output = await processChunk(chunks[i]);
          setResults((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: 'complete', output } : r))
          );
        } catch {
          setResults((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: 'error' } : r))
          );
          showToast(`Error processing chunk ${i + 1}`);
        }
      }
    } else {
      const promises = chunks.map(async (chunk, i) => {
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'processing' } : r))
        );

        try {
          const output = await processChunk(chunk);
          setResults((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: 'complete', output } : r))
          );
        } catch {
          setResults((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: 'error' } : r))
          );
        }
      });

      await Promise.all(promises);
    }

    setIsProcessing(false);
    showToast('Processing complete!');
  };

  useEffect(() => {
    if (results.length === 0) {
      startProcessing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyAll = () => {
    const allText = results
      .filter((r) => r.status === 'complete')
      .map((r) => r.output)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(allText);
    showToast('All results copied to clipboard!');
  };

  const copyChunk = (output: string) => {
    navigator.clipboard.writeText(output);
    showToast('Copied to clipboard!');
  };

  const completedCount = results.filter((r) => r.status === 'complete').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-100">Processing Results</h2>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-400">Mode:</label>
              <select
                value={processingMode}
                onChange={(e) => setProcessingMode(e.target.value)}
                disabled={isProcessing}
                className="p-2 bg-surface-light border border-surface-lighter rounded-md text-gray-200 focus:outline-none"
              >
                <option value="sequential">Sequential</option>
                <option value="parallel">Parallel</option>
              </select>
            </div>
            {!isProcessing && completedCount > 0 && (
              <Button size="small" onClick={copyAll}>
                <span className="flex items-center gap-2">
                  <Copy size={14} />
                  Copy All
                </span>
              </Button>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="p-6 bg-surface rounded-lg mb-6 text-center">
            <Loader2 size={32} className="mx-auto mb-2 text-accent animate-spin" />
            <div className="text-lg mb-2">
              Processing{' '}
              {processingMode === 'sequential'
                ? `chunk ${currentProcessing}/${chunks.length}`
                : 'chunks in parallel'}
              ...
            </div>
            <div className="w-full h-2 bg-surface-light rounded overflow-hidden mt-4">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-purple transition-all duration-300"
                style={{ width: `${(completedCount / chunks.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!isProcessing && (
          <div className="mb-6 flex gap-4 text-sm">
            <span className="text-emerald-500 flex items-center gap-1">
              <CheckCircle size={14} />
              {completedCount} completed
            </span>
            {errorCount > 0 && (
              <span className="text-red-500 flex items-center gap-1">
                <XCircle size={14} />
                {errorCount} errors
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {chunks.map((chunk, index) => {
            const result = results[index];
            if (!result) return null;

            const borderColor = {
              complete: 'border-emerald-500',
              error: 'border-red-500',
              processing: 'border-accent',
              pending: 'border-surface-light',
            }[result.status];

            return (
              <div
                key={chunk.id}
                className={`p-6 bg-surface rounded-lg border-2 ${borderColor}`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base mb-1">{chunk.title}</h3>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      {result.status === 'pending' && (
                        <>
                          <Clock size={12} />
                          Pending...
                        </>
                      )}
                      {result.status === 'processing' && (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Processing...
                        </>
                      )}
                      {result.status === 'complete' && (
                        <>
                          <CheckCircle size={12} />
                          Complete
                        </>
                      )}
                      {result.status === 'error' && (
                        <>
                          <XCircle size={12} />
                          Error
                        </>
                      )}
                    </div>
                  </div>
                  {result.status === 'complete' && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => copyChunk(result.output!)}
                    >
                      <span className="flex items-center gap-1">
                        <Copy size={14} />
                        Copy
                      </span>
                    </Button>
                  )}
                </div>

                {result.status === 'complete' && (
                  <div className="p-4 bg-surface-dark rounded-md font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {result.output}
                  </div>
                )}

                {result.status === 'processing' && (
                  <div className="text-center py-8 text-accent">
                    <Loader2 size={40} className="mx-auto animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-8">
          <Button variant="secondary" onClick={onBack} disabled={isProcessing}>
            &larr; Back
          </Button>
          {!isProcessing && (
            <Button onClick={() => window.location.reload()}>
              <span className="flex items-center gap-2">
                <RefreshCw size={16} />
                Start Over
              </span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
