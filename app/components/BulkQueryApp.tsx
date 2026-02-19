'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import StepIndicator from './StepIndicator';
import ToastContainer from './ToastContainer';
import ApiKeySettings, { getStoredApiKey } from './ApiKeySettings';
import Step1TaskDefinition from './Step1TaskDefinition';
import Step2TextInput from './Step2TextInput';
import Step3Chunking from './Step3Chunking';
import Step4Processing from './Step4Processing';
import Button from '@/components/ui/Button';
import { generateId } from '@/lib/utils';
import type { Template, Chunk, ProcessingResult } from '@/lib/schemas/task';

interface Toast {
  id: string;
  message: string;
}

export default function BulkQueryApp() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Step 1: Task Definition
  const [taskPrompt, setTaskPrompt] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);

  // Step 2: Text Input
  const [rawText, setRawText] = useState('');

  // Step 3: Chunking
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isChunking, setIsChunking] = useState(false);

  // Step 4: Processing
  const [processingMode, setProcessingMode] = useState('sequential');
  const [results, setResults] = useState<ProcessingResult[]>([]);

  const showToast = (message: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const refreshApiKeyStatus = () => {
    setHasApiKey(!!getStoredApiKey());
  };

  const goToStep = (step: number) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  };

  const completeStep = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }
  };

  const nextStep = () => {
    completeStep(currentStep);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentStep < 4) {
          nextStep();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault();
        if (currentStep > 1) {
          prevStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Load saved templates from localStorage + check API key
  useEffect(() => {
    const saved = localStorage.getItem('bulk-query-templates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
    refreshApiKeyStatus();
  }, []);

  // Save templates to localStorage
  useEffect(() => {
    if (savedTemplates.length > 0) {
      localStorage.setItem('bulk-query-templates', JSON.stringify(savedTemplates));
    }
  }, [savedTemplates]);

  return (
    <div className="max-w-app mx-auto p-8 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-br from-accent to-accent-purple bg-clip-text text-transparent">
          bulk-query
        </h1>
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowSettings(true)}
            className={!hasApiKey ? 'border border-amber-500/50' : ''}
          >
            <span className="flex items-center gap-2">
              <Settings size={16} />
              {hasApiKey ? 'API Settings' : 'Set API Key'}
            </span>
          </Button>
          <div className="text-xs text-gray-500 text-right">
            <div>Cmd/Ctrl + Enter: Next Step</div>
            <div>Cmd/Ctrl + Backspace: Previous Step</div>
          </div>
        </div>
      </div>

      {/* API key warning banner */}
      {!hasApiKey && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
          <div className="text-sm text-amber-200">
            <strong>No API key configured.</strong>{' '}
            Add your Anthropic API key to enable AI-powered chunking and processing.
          </div>
          <Button size="small" onClick={() => setShowSettings(true)}>
            Configure
          </Button>
        </div>
      )}

      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {currentStep === 1 && (
        <Step1TaskDefinition
          taskPrompt={taskPrompt}
          setTaskPrompt={setTaskPrompt}
          savedTemplates={savedTemplates}
          setSavedTemplates={setSavedTemplates}
          onNext={nextStep}
          showToast={showToast}
        />
      )}

      {currentStep === 2 && (
        <Step2TextInput
          rawText={rawText}
          setRawText={setRawText}
          onNext={nextStep}
          onBack={prevStep}
          showToast={showToast}
        />
      )}

      {currentStep === 3 && (
        <Step3Chunking
          rawText={rawText}
          taskPrompt={taskPrompt}
          chunks={chunks}
          setChunks={setChunks}
          isChunking={isChunking}
          setIsChunking={setIsChunking}
          onNext={nextStep}
          onBack={prevStep}
          showToast={showToast}
        />
      )}

      {currentStep === 4 && (
        <Step4Processing
          chunks={chunks}
          taskPrompt={taskPrompt}
          processingMode={processingMode}
          setProcessingMode={setProcessingMode}
          results={results}
          setResults={setResults}
          onBack={prevStep}
          showToast={showToast}
        />
      )}

      {showSettings && (
        <ApiKeySettings
          onClose={() => {
            setShowSettings(false);
            refreshApiKeyStatus();
          }}
          showToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
