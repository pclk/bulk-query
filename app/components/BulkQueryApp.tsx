'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Settings, LogOut, User } from 'lucide-react';
import StepIndicator from './StepIndicator';
import ToastContainer from './ToastContainer';
import ApiKeySettings, { getStoredApiKey } from './ApiKeySettings';
import LoginForm from './LoginForm';
import ProjectHistory from './ProjectHistory';
import Step1TaskDefinition from './Step1TaskDefinition';
import Step2TextInput from './Step2TextInput';
import Step3Chunking from './Step3Chunking';
import Step4Processing from './Step4Processing';
import Button from '@/components/ui/Button';
import {
  deleteGuestProject,
  endGuestSession,
  GUEST_USER_LABEL,
  getGuestProjects,
  isGuestSessionActive,
  startGuestSession,
  toProjectSummaries,
  upsertGuestProject,
} from '@/lib/guest';
import { generateId } from '@/lib/utils';
import type {
  AuthMode,
  Template,
  Chunk,
  ProcessingResult,
  ProjectRecord,
  ProjectSummary,
} from '@/lib/schemas/task';

interface Toast {
  id: string;
  message: string;
}

export default function BulkQueryApp() {
  const { data: session, status } = useSession();
  const [isGuest, setIsGuest] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

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

  const authMode: AuthMode | null = session ? 'account' : isGuest ? 'guest' : null;

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

  const refreshProjects = async (mode: AuthMode) => {
    setProjectsLoading(true);

    if (mode === 'guest') {
      setProjects(toProjectSummaries(getGuestProjects()));
      setProjectsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        throw new Error('Failed to load projects');
      }

      const data = await res.json();
      setProjects(data.projects);
    } catch {
      showToast('Failed to load projects');
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
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
    setIsGuest(isGuestSessionActive());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!authReady || status === 'loading') {
      return;
    }

    if (!authMode) {
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    refreshProjects(authMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMode, authReady, status]);

  // Save templates to localStorage
  useEffect(() => {
    if (savedTemplates.length > 0) {
      localStorage.setItem('bulk-query-templates', JSON.stringify(savedTemplates));
      return;
    }

    localStorage.removeItem('bulk-query-templates');
  }, [savedTemplates]);

  const saveProject = async (name: string): Promise<boolean> => {
    if (!authMode) {
      showToast('Sign in or continue as guest to save projects');
      return false;
    }

    if (authMode === 'guest') {
      const timestamp = new Date().toISOString();
      const project: ProjectRecord = {
        id: generateId(),
        name,
        taskPrompt,
        rawText,
        chunks,
        results: results.length > 0 ? results : null,
        processingMode,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const nextProjects = upsertGuestProject(project);
      setProjects(toProjectSummaries(nextProjects));
      showToast(`Project "${name}" saved locally`);
      return true;
    }

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

      const data = await res.json();
      setProjects((prev) => [
        {
          id: data.project.id,
          name: data.project.name,
          taskPrompt: data.project.taskPrompt,
          processingMode: data.project.processingMode,
          createdAt: data.project.createdAt,
          updatedAt: data.project.updatedAt,
        },
        ...prev.filter((project) => project.id !== data.project.id),
      ]);
      showToast(`Project "${name}" saved!`);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed');
      return false;
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
    } else if (project.rawText) {
      setCompletedSteps([1]);
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  };

  const handleGuestLogin = () => {
    startGuestSession();
    setIsGuest(true);
    setProjects(toProjectSummaries(getGuestProjects()));
    showToast('Guest mode enabled');
  };

  const handleSignOut = async () => {
    if (authMode === 'guest') {
      endGuestSession();
      setIsGuest(false);
      setProjects([]);
      showToast('Guest session ended');
      return;
    }

    await signOut({ redirect: false });
  };

  const handleLoadProject = async (id: string) => {
    if (!authMode) {
      showToast('Sign in or continue as guest first');
      return;
    }

    if (authMode === 'guest') {
      const project = getGuestProjects().find((entry) => entry.id === id);
      if (!project) {
        showToast('Failed to load project');
        return;
      }

      loadProject(project);
      showToast(`Loaded: ${project.name}`);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        throw new Error('Failed to load project');
      }

      const data = await res.json();
      loadProject(data.project);
      showToast(`Loaded: ${data.project.name}`);
    } catch {
      showToast('Failed to load project');
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!authMode) {
      return;
    }

    if (authMode === 'guest') {
      const nextProjects = deleteGuestProject(id);
      setProjects(toProjectSummaries(nextProjects));
      showToast(`Deleted: ${name}`);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      setProjects((prev) => prev.filter((project) => project.id !== id));
      showToast(`Deleted: ${name}`);
    } catch {
      showToast('Failed to delete project');
    }
  };

  if (status === 'loading' || !authReady) {
    return (
      <div className="max-w-app mx-auto p-8 min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show login form when not authenticated
  if (!authMode) {
    return (
      <div className="max-w-app mx-auto p-8 min-h-screen">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-accent to-accent-purple bg-clip-text text-transparent">
            bulk-query
          </h1>
          <p className="text-gray-400 mt-2">Process large text inputs through AI operations</p>
        </div>
        <LoginForm showToast={showToast} onGuestLogin={handleGuestLogin} />
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  const canSaveProject = taskPrompt.trim().length > 0 && rawText.trim().length > 0;

  return (
    <div className="max-w-app mx-auto p-8 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-br from-accent to-accent-purple bg-clip-text text-transparent">
          bulk-query
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <User size={14} />
            {authMode === 'guest' ? GUEST_USER_LABEL : session?.user?.email}
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={handleSignOut}
          >
            <span className="flex items-center gap-1">
              <LogOut size={14} />
              {authMode === 'guest' ? 'Exit Guest' : 'Sign Out'}
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
            Add your Anthropic API key to enable AI-powered chunking and processing.
          </div>
          <Button size="small" onClick={() => setShowSettings(true)}>
            Configure
          </Button>
        </div>
      )}

      {/* Project History */}
      <div className="mb-6">
        <ProjectHistory
          authMode={authMode}
          projects={projects}
          loading={projectsLoading}
          onLoadProject={handleLoadProject}
          onSaveProject={saveProject}
          onDeleteProject={handleDeleteProject}
          showToast={showToast}
          canSave={canSaveProject}
        />
      </div>

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
