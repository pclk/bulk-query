'use client';

import { useState } from 'react';
import { Copy, Loader2, Play, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getStoredApiKey, getStoredModel } from './ApiKeySettings';
import type { Chunk, ProcessingResult } from '@/lib/schemas/task';

interface Step4Props {
  chunks: Chunk[];
  taskPrompt: string;
  processingMode: string;
  setProcessingMode: (mode: string) => void;
  results: ProcessingResult[];
  onResultsPersist: (results: ProcessingResult[]) => void;
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
  onResultsPersist,
  setResults,
  onBack,
  showToast,
}: Step4Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState(0);

  const missingTask = !taskPrompt.trim();

  const processChunk = async (chunk: Chunk): Promise<string> => {
    const apiKey = getStoredApiKey();
    const model = getStoredModel();

    const res = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey, 'x-model': model } : {}),
      },
      body: JSON.stringify({ chunk, taskPrompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Processing failed');
    }

    return data.output;
  };

  const startProcessing = async () => {
    if (missingTask) {
      showToast('Set a task prompt first');
      return;
    }

    if (chunks.length === 0) {
      showToast('No chunks available to process');
      return;
    }

    setIsProcessing(true);
    setCurrentProcessing(0);

    let nextResults: ProcessingResult[] = chunks.map((chunk) => ({
      chunkId: chunk.id,
      status: 'pending',
      output: null,
    }));
    setResults(nextResults);

    const updateResult = (index: number, patch: Partial<ProcessingResult>) => {
      nextResults = nextResults.map((result, resultIndex) => (
        resultIndex === index ? { ...result, ...patch } : result
      ));
      setResults(nextResults);
    };

    if (processingMode === 'sequential') {
      for (let i = 0; i < chunks.length; i++) {
        setCurrentProcessing(i + 1);
        updateResult(i, { status: 'processing' });

        try {
          const output = await processChunk(chunks[i]);
          updateResult(i, { status: 'complete', output });
        } catch {
          updateResult(i, { status: 'error' });
          showToast(`Error processing chunk ${i + 1}`);
        }
      }
    } else {
      const promises = chunks.map(async (chunk, index) => {
        updateResult(index, { status: 'processing' });

        try {
          const output = await processChunk(chunk);
          updateResult(index, { status: 'complete', output });
        } catch {
          updateResult(index, { status: 'error' });
          showToast(`Error processing chunk ${index + 1}`);
        }
      });

      await Promise.all(promises);
    }

    onResultsPersist(nextResults);
    setIsProcessing(false);
    showToast('Processing complete!');
  };

  const copyAll = () => {
    const allText = results
      .filter((result) => result.status === 'complete')
      .map((result) => result.output)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(allText);
    showToast('All results copied to clipboard!');
  };

  const copyChunk = (output: string) => {
    navigator.clipboard.writeText(output);
    showToast('Copied to clipboard!');
  };

  const clearResults = () => {
    setResults([]);
    onResultsPersist([]);
    showToast('Results cleared');
  };

  const completedCount = results.filter((result) => result.status === 'complete').length;
  const errorCount = results.filter((result) => result.status === 'error').length;

  if (missingTask) {
    return (
      <div>
        <Card className="py-12 text-center">
          <h2 className="mb-4 text-xl font-semibold text-gray-100">No Task Defined</h2>
          <p className="mb-6 text-gray-400">
            You need to define a task prompt in step 3a before processing chunks with the API.
          </p>
          <Button variant="secondary" onClick={onBack}>
            &larr; Back to Define Task
          </Button>
        </Card>
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div>
        <Card className="py-12 text-center">
          <h2 className="mb-4 text-xl font-semibold text-gray-100">No Chunks Available</h2>
          <p className="mb-6 text-gray-400">
            Run chunking in step 2 before starting processing.
          </p>
          <Button variant="secondary" onClick={onBack}>
            &larr; Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Processing</h2>
            <p className="mt-2 text-gray-400">
              Review the processing mode, then run the AI. You can rerun processing anytime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Mode:</label>
              <select
                value={processingMode}
                onChange={(e) => setProcessingMode(e.target.value)}
                disabled={isProcessing}
                className="rounded-md border border-surface-lighter bg-surface-light p-2 text-gray-200 focus:outline-none"
              >
                <option value="sequential">Sequential</option>
                <option value="parallel">Parallel</option>
              </select>
            </div>
            <Button size="small" onClick={startProcessing} disabled={isProcessing}>
              <span className="flex items-center gap-2">
                {results.length > 0 ? <RotateCcw size={14} /> : <Play size={14} />}
                {results.length > 0 ? 'Run Again' : 'Run Processing'}
              </span>
            </Button>
            {!isProcessing && results.length > 0 && (
              <Button variant="secondary" size="small" onClick={clearResults}>
                Clear Results
              </Button>
            )}
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
          <div className="mb-6 rounded-lg bg-surface p-6 text-center">
            <Loader2 size={32} className="mx-auto mb-2 animate-spin text-accent" />
            <div className="mb-2 text-lg">
              Processing{' '}
              {processingMode === 'sequential'
                ? `chunk ${currentProcessing}/${chunks.length}`
                : 'chunks in parallel'}
              ...
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded bg-surface-light">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-purple transition-all duration-300"
                style={{ width: `${(completedCount / chunks.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!isProcessing && results.length === 0 && (
          <div className="mb-6 rounded-lg border border-dashed border-surface-lighter bg-surface/40 p-6 text-sm text-gray-400">
            Nothing has been processed yet. Choose a mode and run processing when you are ready.
          </div>
        )}

        {!isProcessing && results.length > 0 && (
          <div className="mb-6 flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle size={14} />
              {completedCount} completed
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <XCircle size={14} />
                {errorCount} errors
              </span>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-6">
            {chunks.map((chunk, index) => {
              const result = results[index];
              if (!result) {
                return null;
              }

              const borderColor = {
                complete: 'border-emerald-500',
                error: 'border-red-500',
                processing: 'border-accent',
                pending: 'border-surface-light',
              }[result.status];

              return (
                <div
                  key={chunk.id}
                  className={`rounded-lg border-2 bg-surface p-6 ${borderColor}`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="mb-1 text-base">{chunk.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
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
                    {result.status === 'complete' && result.output && (
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

                  {result.status === 'complete' && result.output && (
                    <div className="max-h-[300px] overflow-y-auto rounded-md bg-surface-dark p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      {result.output}
                    </div>
                  )}

                  {result.status === 'processing' && (
                    <div className="py-8 text-center text-accent">
                      <Loader2 size={40} className="mx-auto animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="secondary" onClick={onBack} disabled={isProcessing}>
            &larr; Back
          </Button>
        </div>
      </Card>
    </div>
  );
}
