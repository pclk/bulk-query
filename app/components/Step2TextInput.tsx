'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import { countWords, getWordCountStatus } from '@/lib/utils';
import type { InputTextTemplate } from '@/lib/input-templates';

interface Step2Props {
  rawText: string;
  setRawText: (text: string) => void;
  onNext: () => void;
  showToast: (message: string) => void;
  onAutoSave?: (text: string) => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
}

export default function Step2TextInput({
  rawText,
  setRawText,
  onNext,
  showToast,
  onAutoSave,
  saveStatus = 'idle',
}: Step2Props) {
  const wordCount = countWords(rawText);
  const wordStatus = getWordCountStatus(wordCount);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [localSaveStatus, setLocalSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [templates, setTemplates] = useState<InputTextTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState(false);

  const effectiveSaveStatus = saveStatus !== 'idle' ? saveStatus : localSaveStatus;

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/input-templates');
        if (!res.ok) {
          throw new Error('Failed to load templates');
        }

        const data = await res.json();
        setTemplates(Array.isArray(data.templates) ? data.templates : []);
        setTemplatesError(false);
      } catch {
        setTemplates([]);
        setTemplatesError(true);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Debounced auto-save to server via onAutoSave callback
  useEffect(() => {
    if (!rawText.trim()) return;

    setLocalSaveStatus('saving');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (onAutoSave) {
        onAutoSave(rawText);
      }
      setLocalSaveStatus('saved');
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rawText, onAutoSave]);

  const handleClear = () => {
    setRawText('');
    setLocalSaveStatus('idle');
    if (onAutoSave) {
      onAutoSave('');
    }
    showToast('Text cleared');
  };

  const handleNext = () => {
    if (!rawText.trim()) {
      showToast('Please paste some text first');
      return;
    }
    if (wordCount < 100) {
      showToast('Text is too short for chunking');
      return;
    }
    onNext();
  };

  const applyTemplate = (template: InputTextTemplate) => {
    setRawText(template.content);
    setLocalSaveStatus('saving');
    showToast(`Loaded "${template.name}"`);
  };

  return (
    <div>
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Input Your Text</h2>
        <p className="mb-6 text-gray-400">
          Paste the text you want to process. A minimum of 1,000 words is recommended.
          Shorter inputs can often be sent directly to an AI, since it can usually generate that much text back on its own.
        </p>

        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-xl font-semibold">
              {wordCount.toLocaleString()} words
            </span>
            <span className={`text-sm ${wordStatus.color}`}>
              {wordStatus.message}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-save status indicator */}
            {rawText.trim() && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {effectiveSaveStatus === 'saving' && (
                  <>
                    <Save size={12} className="animate-pulse" />
                    Saving...
                  </>
                )}
                {effectiveSaveStatus === 'saved' && (
                  <>
                    <CheckCircle size={12} className="text-emerald-500" />
                    Draft saved
                  </>
                )}
              </span>
            )}
            <Button variant="secondary" size="small" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm text-gray-400">Input templates</div>
          {templatesLoading && (
            <div className="text-xs text-gray-500">Loading templates...</div>
          )}
          {!templatesLoading && templatesError && (
            <div className="text-xs text-red-400">Failed to load templates.</div>
          )}
          {!templatesLoading && !templatesError && templates.length === 0 && (
            <div className="text-xs text-gray-500">
              No files found in the project `input_templates/` folder.
            </div>
          )}
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-full border border-surface-lighter bg-surface-light px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-accent hover:text-white"
                >
                  {template.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your text here..."
          rows={20}
          className="mb-6"
        />

        <div className="flex justify-end">
          <Button onClick={handleNext}>Chunk Text &rarr;</Button>
        </div>
      </Card>
    </div>
  );
}
