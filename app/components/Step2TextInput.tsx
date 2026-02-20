'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import { countWords, getWordCountStatus } from '@/lib/utils';

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

  const effectiveSaveStatus = saveStatus !== 'idle' ? saveStatus : localSaveStatus;

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

  return (
    <div>
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Input Your Text</h2>
        <p className="mb-6 text-gray-400">
          Paste the text you want to process (recommended: 1,000&ndash;6,000 words).
          Your text is auto-saved to your account as you type.
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
