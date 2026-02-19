'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import { countWords, getWordCountStatus } from '@/lib/utils';

interface Step2Props {
  rawText: string;
  setRawText: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
  showToast: (message: string) => void;
}

export default function Step2TextInput({ rawText, setRawText, onNext, onBack, showToast }: Step2Props) {
  const wordCount = countWords(rawText);
  const wordStatus = getWordCountStatus(wordCount);

  const handleClear = () => {
    setRawText('');
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
          Paste the text you want to process (recommended: 1,000-6,000 words)
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
          <Button variant="secondary" size="small" onClick={handleClear}>
            Clear
          </Button>
        </div>

        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your text here..."
          rows={20}
          className="mb-6"
        />

        <div className="flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            &larr; Back
          </Button>
          <Button onClick={handleNext}>Chunk Text &rarr;</Button>
        </div>
      </Card>
    </div>
  );
}
