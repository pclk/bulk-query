'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Settings, LogOut, User, Plus } from 'lucide-react';
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

/** Generate an auto-name from the first ~40 chars of text */
function autoProjectName(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40).trimEnd() + '...';
}

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

  // Project auto-save state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  // Track whether templates changed by the user (not initial load)
  const templatesSaveRef = useRef(false);
  const draftSaveRef = useRef<NodeJS.Timeout | null>(null);
  const projectSaveRef = useRef<NodeJS.Timeout | null>(null);
  const projectRefreshRef = useRef<(() => void) | null>(null);

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

  // === Project auto-save ===

  const createProject = useCallback(async (text: string): Promise<string | null> => {
    try {
      const name = autoProjectName(text);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          taskPrompt: '',
          rawText: text,
          chunks: [],
          results: null,
          processingMode: 'sequential',
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      setProjectName(name);
      projectRefreshRef.current?.();
      return data.project.id;
    } catch {
      return null;
    }
  }, []);

  const updateProject = useCallback(async (projectId: string, fields: Record<string, unknown>) => {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      projectRefreshRef.current?.();
    } catch {
      // Silent fail for auto-save
    }
  }, []);

  const debouncedProjectSave = useCallback((projectId: string, fields: Record<string, unknown>) => {
    if (projectSaveRef.current) clearTimeout(projectSaveRef.current);
    projectSaveRef.current = setTimeout(() => {
      updateProject(projectId, fields);
    }, 2000);
  }, [updateProject]);

  // Auto-create project when moving from step 1 to step 2
  const handleNextFromStep1 = useCallback(async () => {
    completeStep(1);
    setCurrentStep(2);

    if (!currentProjectId && rawText.trim()) {
      const id = await createProject(rawText);
      if (id) setCurrentProjectId(id);
    } else if (currentProjectId) {
      updateProject(currentProjectId, { rawText });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, rawText, createProject, updateProject]);

  // Auto-save chunks when they change (after chunking step)
  useEffect(() => {
    if (currentProjectId && chunks.length > 0) {
      debouncedProjectSave(currentProjectId, { chunks });
    }
  }, [chunks, currentProjectId, debouncedProjectSave]);

  // Auto-save task prompt when it changes
  useEffect(() => {
    if (currentProjectId && taskPrompt) {
      debouncedProjectSave(currentProjectId, { taskPrompt });
    }
  }, [taskPrompt, currentProjectId, debouncedProjectSave]);

  // Auto-save results when they change
  useEffect(() => {
    if (currentProjectId && results.length > 0) {
      debouncedProjectSave(currentProjectId, { results });
    }
  }, [results, currentProjectId, debouncedProjectSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere with sequential copy shortcuts when on step 3b
      if (currentStep === 3 && subStep === '3b') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentStep < 4) {
          if (currentStep === 1) {
            handleNextFromStep1();
          } else {
            nextStep();
          }
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
  }, [currentStep, subStep, handleNextFromStep1]);

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

  const loadProject = (project: {
    id: string;
    name: string;
    rawText: string;
    taskPrompt: string;
    chunks: Chunk[];
    results: ProcessingResult[] | null;
    processingMode: string;
  }) => {
    setCurrentProjectId(project.id);
    setProjectName(project.name);
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

  const startNewProject = () => {
    setCurrentProjectId(null);
    setProjectName('');
    setTaskPrompt('');
    setRawText('');
    setChunks([]);
    setResults([]);
    setProcessingMode('sequential');
    setCurrentStep(1);
    setCompletedSteps([]);
    setSubStep('3a');
  };

  // Determine whether to hide step 4 (when sequential copy mode is active)
  const isSequentialCopyMode = currentStep === 3 && subStep === '3b';

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
      <div className="max-w-[600px] mx-auto p-8 min-h-screen">
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

  return (
    <div className="max-w-app mx-auto px-6 py-4 min-h-screen">
      {/* Compact Header: title + steps + controls */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className="text-xl font-bold bg-gradient-to-br from-accent to-accent-purple bg-clip-text text-transparent shrink-0">
          bulk-query
        </h1>

        <StepIndicator
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
          subStep={currentStep === 3 ? subStep : null}
          onSubStepClick={setSubStep}
          hideStep4={isSequentialCopyMode}
        />

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 hidden lg:inline">
            <User size={12} className="inline mr-1" />
            {session.user?.email}
          </span>
          <Button
            variant="secondary"
            size="small"
            onClick={() => signOut()}
          >
            <LogOut size={14} />
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowSettings(true)}
            className={!hasApiKey ? 'border border-amber-500/50' : ''}
          >
            <Settings size={14} />
          </Button>
        </div>
      </div>

      {/* API key warning banner */}
      {!hasApiKey && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
          <div className="text-sm text-amber-200">
            <strong>No API key.</strong>{' '}
            Required for chunking. Use Sequential Copy (step 3b) to process manually.
          </div>
          <Button size="small" onClick={() => setShowSettings(true)}>
            Configure
          </Button>
        </div>
      )}

      {/* Main layout: Sidebar + Content */}
      <div className="grid grid-cols-[240px_1fr] gap-5">
        {/* Left Sidebar: Projects */}
        <aside className="sticky top-4 self-start space-y-3">
          <ProjectHistory
            onLoad={loadProject}
            showToast={showToast}
            currentProjectId={currentProjectId}
            onRefreshRef={projectRefreshRef}
          />

          {/* Current project indicator + New Project */}
          <div className="text-xs text-gray-500 px-1">
            {currentProjectId ? (
              <span className="truncate block">
                <span className="text-gray-400">{projectName}</span>
                <span className="text-gray-600 ml-1">(auto-saving)</span>
              </span>
            ) : (
              'Auto-creates project on next step'
            )}
          </div>
          <Button variant="secondary" size="small" onClick={startNewProject} className="w-full">
            <span className="flex items-center justify-center gap-1">
              <Plus size={14} />
              New Project
            </span>
          </Button>
        </aside>

        {/* Main Content */}
        <main className="min-w-0">
          {/* Step 1: Input Text */}
          {currentStep === 1 && (
            <Step2TextInput
              rawText={rawText}
              setRawText={setRawText}
              onNext={handleNextFromStep1}
              showToast={showToast}
              onAutoSave={handleAutoSave}
            />
          )}

          {/* Step 2: Chunk & Adjust */}
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

          {/* Step 4: Process & Export */}
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
        </main>
      </div>

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
