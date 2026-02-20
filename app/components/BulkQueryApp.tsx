'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Settings, LogOut, User } from 'lucide-react';
import StepIndicator from './StepIndicator';
import ToastContainer, { type Toast } from './ToastContainer';
import ApiKeySettings, {
  getStoredApiKey,
  loadSettingsFromServer,
  saveSettingToServer,
} from './ApiKeySettings';
import LoginForm from './LoginForm';
import ProjectHistory from './ProjectHistory';
import Step1TaskDefinition from './Step1TaskDefinition';
import Step2TextInput from './Step2TextInput';
import Step3Chunking from './Step3Chunking';
import Step3SequentialCopy from './Step3SequentialCopy';
import Step4Processing from './Step4Processing';
import Button from '@/components/ui/Button';
import { generateId } from '@/lib/utils';
import type { Template, Chunk, ProcessingResult } from '@/lib/schemas/task';

export default function BulkQueryApp() {
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [subStep, setSubStep] = useState<'3a' | '3b'>('3a');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Step 3a: Task Definition (optional)
  const [taskPrompt, setTaskPrompt] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);

  // Step 1: Text Input
  const [rawText, setRawText] = useState('');

  // Step 2: Chunking
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [isChunking, setIsChunking] = useState(false);

  // Step 4: Processing (optional)
  const [processingMode, setProcessingMode] = useState('sequential');
  const [results, setResults] = useState<ProcessingResult[]>([]);

  // Track whether templates changed by the user (not initial load)
  const templatesSaveRef = useRef(false);
  const draftSaveRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, error?: unknown) => {
    const id = generateId();
    const debug = error
      ? error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error)
      : undefined;
    setToasts((prev) => [...prev, { id, message, debug }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
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

  // Navigate directly to step 4 from task definition (3a)
  const goToProcessing = () => {
    completeStep(3);
    setCurrentStep(4);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere with sequential copy shortcuts when on step 3b
      if (currentStep === 3 && subStep === '3b') return;

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
  }, [currentStep, subStep]);

  // Load all settings from server on session start
  useEffect(() => {
    if (!session) return;

    const loadSettings = async () => {
      const settings = await loadSettingsFromServer();
      if (settings) {
        if (Array.isArray(settings.templates) && settings.templates.length > 0) {
          setSavedTemplates(settings.templates as Template[]);
        }
        if (settings.draftText) {
          setRawText(settings.draftText);
        }
      }
      refreshApiKeyStatus();
      setSettingsLoaded(true);
    };

    loadSettings();
  }, [session]);

  // Save templates to server when they change (skip initial load)
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!templatesSaveRef.current) {
      templatesSaveRef.current = true;
      return;
    }
    saveSettingToServer('templates', savedTemplates);
  }, [savedTemplates, settingsLoaded]);

  // Debounced draft text save to server
  const handleAutoSave = useCallback(
    async (text: string) => {
      if (!session) return;

      if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
      draftSaveRef.current = setTimeout(() => {
        saveSettingToServer('draftText', text);
      }, 3000);
    },
    [session]
  );

  const saveProject = async (name: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          taskPrompt,
          rawText,
          chunks,
          results: results.length > 0 ? results : null,
          processingMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }

      showToast(`Project "${name}" saved!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', err);
    }
  };

  const loadProject = (project: {
    rawText: string;
    taskPrompt: string;
    chunks: Chunk[];
    results: ProcessingResult[] | null;
    processingMode: string;
  }) => {
    setTaskPrompt(project.taskPrompt);
    setRawText(project.rawText);
    setChunks(project.chunks);
    setResults(project.results || []);
    setProcessingMode(project.processingMode);

    // Auto-navigate to the most relevant step
    if (project.results && project.results.length > 0) {
      setCompletedSteps([1, 2, 3]);
      setCurrentStep(4);
    } else if (project.chunks.length > 0) {
      setCompletedSteps([1, 2]);
      setCurrentStep(3);
      setSubStep('3a');
    } else if (project.rawText) {
      setCompletedSteps([1]);
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  };

  if (status === 'loading') {
    return (
      <div className="max-w-app mx-auto p-8 min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show login form when not authenticated
  if (!session) {
    return (
      <div className="max-w-app mx-auto p-8 min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-accent to-accent-purple bg-clip-text text-transparent">
            bulk-query
          </h1>
          <p className="text-gray-400 mt-2">Process large text inputs through AI operations</p>
        </div>
        <LoginForm showToast={showToast} />
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  const canSaveProject = rawText.trim().length > 0;

  return (
    <div className="max-w-app mx-auto p-8 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-br from-accent to-accent-purple bg-clip-text text-transparent">
          bulk-query
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <User size={14} />
            {session.user?.email}
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={() => signOut()}
          >
            <span className="flex items-center gap-1">
              <LogOut size={14} />
              Sign Out
            </span>
          </Button>
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
        </div>
      </div>

      {/* API key warning banner */}
      {!hasApiKey && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
          <div className="text-sm text-amber-200">
            <strong>No API key configured.</strong>{' '}
            An Anthropic API key is required for chunking. You can use Sequential Copy (step 3b) to process chunks manually with your preferred chatbot.
          </div>
          <Button size="small" onClick={() => setShowSettings(true)}>
            Configure
          </Button>
        </div>
      )}

      {/* Project History */}
      <div className="mb-6">
        <ProjectHistory
          onLoad={loadProject}
          onSave={saveProject}
          showToast={showToast}
          canSave={canSaveProject}
        />
      </div>

      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        subStep={currentStep === 3 ? subStep : null}
        onSubStepClick={setSubStep}
      />

      {/* Step 1: Input Text (was Step 2) */}
      {currentStep === 1 && (
        <Step2TextInput
          rawText={rawText}
          setRawText={setRawText}
          onNext={nextStep}
          showToast={showToast}
          onAutoSave={handleAutoSave}
        />
      )}

      {/* Step 2: Chunk & Adjust (was Step 3) */}
      {currentStep === 2 && (
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

      {/* Step 3: Task / Sequential Copy */}
      {currentStep === 3 && subStep === '3a' && (
        <Step1TaskDefinition
          taskPrompt={taskPrompt}
          setTaskPrompt={setTaskPrompt}
          savedTemplates={savedTemplates}
          setSavedTemplates={setSavedTemplates}
          showToast={showToast}
          onProceedToProcess={goToProcessing}
        />
      )}

      {currentStep === 3 && subStep === '3b' && (
        <Step3SequentialCopy
          chunks={chunks}
          onBack={prevStep}
          showToast={showToast}
        />
      )}

      {/* Step 4: Process & Export (optional) */}
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
