'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Settings, LogOut, User } from 'lucide-react';
import StepIndicator from './StepIndicator';
import ToastContainer from './ToastContainer';
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
import { computeCompletedStepCount, countWords, generateId } from '@/lib/utils';
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

function hasProjectResults(nextResults: ProcessingResult[] | null | undefined) {
  return Array.isArray(nextResults) && nextResults.length > 0;
}

export default function BulkQueryApp() {
  const { data: session, status } = useSession();
  const [isGuest, setIsGuest] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [chunkingSubStep, setChunkingSubStep] = useState<'2a' | '2b' | '2c'>('2c');
  const [subStep, setSubStep] = useState<'3a' | '3b'>('3a');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeInputProjectId, setActiveInputProjectId] = useState<string | null>(null);
  const [activeInputProjectName, setActiveInputProjectName] = useState<string | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');

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

  const authMode: AuthMode | null = session ? 'account' : isGuest ? 'guest' : null;
  // Track whether templates changed by the user (not initial load)
  const templatesSaveRef = useRef(false);
  const draftSaveRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveContextRef = useRef(0);
  const pendingProjectCreationRef = useRef<Promise<ProjectRecord | null> | null>(null);
  const activeProjectIdRef = useRef<string | null>(null);
  const activeProjectNameRef = useRef<string | null>(null);

  const showToast = useCallback((message: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

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
      setProjects((data.projects as Array<ProjectSummary & {
        rawText?: string | null;
        chunks?: unknown;
        results?: unknown;
      }>).map((project) => ({
        ...project,
        completedCount: computeCompletedStepCount({
          rawText: project.rawText,
          chunks: project.chunks,
          taskPrompt: project.taskPrompt,
          results: project.results,
        }),
      })));
    } catch {
      showToast('Failed to load projects');
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const upsertProjectSummary = (project: ProjectSummary) => {
    setProjects((prev) => [project, ...prev.filter((entry) => entry.id !== project.id)]);
  };

  const invalidateAutosaveContext = useCallback(() => {
    autosaveContextRef.current += 1;
  }, []);

  const setActiveProject = useCallback((id: string | null, name: string | null) => {
    activeProjectIdRef.current = id;
    activeProjectNameRef.current = name;
    setActiveInputProjectId(id);
    setActiveInputProjectName(name);
  }, []);

  const buildAutoProjectName = useCallback((text: string) => {
    const firstLine = text
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean);

    if (!firstLine) {
      return `Input Draft ${new Date().toLocaleString()}`;
    }

    const shortened = firstLine.length > 48 ? `${firstLine.slice(0, 48).trimEnd()}...` : firstLine;
    return shortened;
  }, []);

  const buildProjectPayload = useCallback((overrides?: {
    name?: string;
    taskPrompt?: string;
    rawText?: string;
    chunks?: Chunk[];
    results?: ProcessingResult[] | null;
    processingMode?: string;
  }) => {
    const hasOverride = (key: 'name' | 'taskPrompt' | 'rawText' | 'chunks' | 'results' | 'processingMode') =>
      Object.prototype.hasOwnProperty.call(overrides ?? {}, key);
    const nextRawText = hasOverride('rawText') ? (overrides?.rawText ?? '') : rawText;
    const nextName = hasOverride('name')
      ? (overrides?.name ?? '')
      : activeProjectNameRef.current ?? buildAutoProjectName(nextRawText);

    return {
      name: nextName,
      taskPrompt: hasOverride('taskPrompt') ? (overrides?.taskPrompt ?? '') : taskPrompt,
      rawText: nextRawText,
      chunks: hasOverride('chunks') ? (overrides?.chunks ?? []) : chunks,
      results: hasOverride('results') ? (overrides?.results ?? null) : (results.length > 0 ? results : null),
      processingMode: hasOverride('processingMode') ? (overrides?.processingMode ?? 'sequential') : processingMode,
    };
  }, [buildAutoProjectName, chunks, processingMode, rawText, results, taskPrompt]);

  const persistProjectState = useCallback(async (options?: {
    name?: string;
    taskPrompt?: string;
    rawText?: string;
    chunks?: Chunk[];
    results?: ProcessingResult[] | null;
    processingMode?: string;
    forceCreate?: boolean;
    allowEmptyRawText?: boolean;
    persistContext?: number;
  }): Promise<ProjectRecord | null> => {
    if (!authMode) {
      return null;
    }

    const persistContext = options?.persistContext ?? autosaveContextRef.current;
    const payload = buildProjectPayload(options);

    if (!options?.allowEmptyRawText && !payload.rawText.trim()) {
      return null;
    }

    if (authMode === 'guest') {
      const timestamp = new Date().toISOString();
      const currentProjectId = options?.forceCreate ? null : activeProjectIdRef.current;
      const existingProject = currentProjectId
        ? getGuestProjects().find((project) => project.id === currentProjectId)
        : null;

      const project: ProjectRecord = {
        id: currentProjectId ?? generateId(),
        ...payload,
        createdAt: existingProject?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };

      const nextProjects = upsertGuestProject(project);
      setProjects(toProjectSummaries(nextProjects));
      setActiveProject(project.id, project.name);
      return project;
    }

    if (!session) {
      return null;
    }

    let projectId = options?.forceCreate ? null : activeProjectIdRef.current;

    if (!projectId && pendingProjectCreationRef.current && !options?.forceCreate) {
      const pendingProject = await pendingProjectCreationRef.current;
      projectId = pendingProject?.id ?? null;
    }

    const shouldCreate = options?.forceCreate || !projectId;
    const res = await fetch(
      shouldCreate ? '/api/projects' : `/api/projects/${projectId}`,
      {
        method: shouldCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const project = data.project as ProjectRecord;

    if (persistContext !== autosaveContextRef.current) {
      return project;
    }

    upsertProjectSummary({
      id: project.id,
      name: project.name,
      taskPrompt: project.taskPrompt,
      processingMode: project.processingMode,
      completedCount: computeCompletedStepCount({
        rawText: project.rawText,
        chunks: project.chunks,
        taskPrompt: project.taskPrompt,
        results: project.results,
      }),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
    setActiveProject(project.id, project.name);
    return project;
  }, [authMode, buildProjectPayload, session, setActiveProject]);

  const handleRawTextChange = (text: string) => {
    if (text === rawText) {
      setRawText(text);
      return;
    }

    setRawText(text);
    setChunks([]);
    setResults([]);
    setIsChunking(false);
    setChunkingSubStep('2c');
  };

  const hasRawText = rawText.trim().length > 0;
  const hasTaskPrompt = taskPrompt.trim().length > 0;
  const hasChunks = chunks.length > 0;
  const hasResults = results.length > 0;
  const completedSteps = [
    ...(hasRawText ? [1] : []),
    ...(hasChunks ? [2] : []),
    ...(hasTaskPrompt ? [3] : []),
    ...(hasResults ? [4] : []),
  ];

  const goToStep = (step: number) => {
    const canNavigate = step <= currentStep
      || (step === 2 && hasRawText)
      || (step === 3 && hasChunks)
      || (step === 4 && (hasChunks || hasResults));

    if (canNavigate) {
      setCurrentStep(step);
    }
  };

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Navigate directly to step 4 from task definition (3a)
  const goToProcessing = useCallback(() => {
    setCurrentStep(4);
  }, []);

  // Load local settings that should be available immediately, even before auth resolves.
  useEffect(() => {
    const savedTemplatesValue = localStorage.getItem('bulk-query-templates');
    const savedDraftText = localStorage.getItem('bulk-query-draft-text');

    if (savedTemplatesValue) {
      try {
        setSavedTemplates(JSON.parse(savedTemplatesValue) as Template[]);
      } catch {
        localStorage.removeItem('bulk-query-templates');
      }
    }

    if (savedDraftText) {
      setRawText(savedDraftText);
    }

    refreshApiKeyStatus();
    setIsGuest(isGuestSessionActive());
    setAuthReady(true);
  }, []);

  // Load account-backed settings after a real session is available.
  useEffect(() => {
    if (!session) {
      setSettingsLoaded(false);
      return;
    }

    const loadSettings = async () => {
      const settings = await loadSettingsFromServer();
      if (settings) {
        if (Array.isArray(settings.templates)) {
          setSavedTemplates(settings.templates as Template[]);
        }
        if (typeof settings.draftText === 'string') {
          setRawText(settings.draftText);
        }
      }

      refreshApiKeyStatus();
      setSettingsLoaded(true);
      templatesSaveRef.current = false;
    };

    loadSettings();
  }, [session]);

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

  // Persist templates locally for guests and as a client-side cache for signed-in users.
  useEffect(() => {
    if (savedTemplates.length > 0) {
      localStorage.setItem('bulk-query-templates', JSON.stringify(savedTemplates));
    } else {
      localStorage.removeItem('bulk-query-templates');
    }

    if (authMode !== 'account' || !settingsLoaded) {
      return;
    }

    if (!templatesSaveRef.current) {
      templatesSaveRef.current = true;
      return;
    }

    saveSettingToServer('templates', savedTemplates);
  }, [savedTemplates, authMode, settingsLoaded]);

  const handleAutoSave = useCallback(
    async (text: string) => {
      const autosaveContext = autosaveContextRef.current;
      localStorage.setItem('bulk-query-draft-text', text);

      if (!text.trim()) {
        return;
      }

      if (authMode === 'account' && session) {
        if (draftSaveRef.current) {
          clearTimeout(draftSaveRef.current);
        }

        draftSaveRef.current = setTimeout(() => {
          saveSettingToServer('draftText', text);
        }, 3000);
      }

      try {
        await persistProjectState({
          rawText: text,
          chunks: [],
          results: null,
          persistContext: autosaveContext,
        });
      } catch {
        // Leave project history untouched if background draft save fails.
      }
    },
    [
      authMode,
      persistProjectState,
      session,
    ]
  );

  useEffect(() => {
    return () => {
      if (draftSaveRef.current) {
        clearTimeout(draftSaveRef.current);
      }
    };
  }, []);

  const loadProject = (project: {
    id?: string;
    name?: string;
    rawText: string;
    taskPrompt: string;
    chunks: Chunk[];
    results: ProcessingResult[] | null;
    processingMode: string;
  }) => {
    invalidateAutosaveContext();
    pendingProjectCreationRef.current = null;
    const inferredChunkingSubStep = project.chunks[0]?.method === 'prompt'
      ? '2b'
      : project.chunks[0]?.method === 'paragraph'
        ? '2c'
        : '2a';
    setTaskPrompt(project.taskPrompt);
    setRawText(project.rawText);
    setChunks(project.chunks);
    setResults(project.results || []);
    setProcessingMode(project.processingMode);
    setChunkingSubStep(project.chunks.length > 0 ? inferredChunkingSubStep : '2c');
    setActiveProject(project.id ?? null, project.name ?? null);

    const projectHasResults = hasProjectResults(project.results);
    const projectHasChunks = project.chunks.length > 0;
    const projectHasTaskPrompt = project.taskPrompt.trim().length > 0;
    const projectHasRawText = project.rawText.trim().length > 0;

    if (projectHasResults) {
      setCurrentStep(4);
    } else if (projectHasChunks || projectHasTaskPrompt) {
      setCurrentStep(3);
      setSubStep('3a');
    } else if (projectHasRawText) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  };

  useEffect(() => {
    setProjectNameInput(activeInputProjectName ?? buildAutoProjectName(rawText));
  }, [activeInputProjectName, buildAutoProjectName, rawText]);

  const handleGuestLogin = () => {
    invalidateAutosaveContext();
    pendingProjectCreationRef.current = null;
    startGuestSession();
    setIsGuest(true);
    setProjects(toProjectSummaries(getGuestProjects()));
    setActiveProject(null, null);
    showToast('Guest mode enabled');
  };

  const handleSignOut = async () => {
    invalidateAutosaveContext();
    pendingProjectCreationRef.current = null;
    if (authMode === 'guest') {
      endGuestSession();
      setIsGuest(false);
      setProjects([]);
      setActiveProject(null, null);
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
      if (activeInputProjectId === id) {
        setActiveProject(null, null);
      }
      showToast(`Deleted: ${name}`);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      setProjects((prev) => prev.filter((project) => project.id !== id));
      if (activeInputProjectId === id) {
        setActiveProject(null, null);
      }
      showToast(`Deleted: ${name}`);
    } catch {
      showToast('Failed to delete project');
    }
  };

  const handleNewProject = async () => {
    invalidateAutosaveContext();
    pendingProjectCreationRef.current = null;
    if (draftSaveRef.current) {
      clearTimeout(draftSaveRef.current);
      draftSaveRef.current = null;
    }

    localStorage.removeItem('bulk-query-draft-text');

    if (authMode === 'account' && session) {
      saveSettingToServer('draftText', '');
    }

    setTaskPrompt('');
    setRawText('');
    setChunks([]);
    setIsChunking(false);
    setProcessingMode('sequential');
    setResults([]);
    setCurrentStep(1);
    setChunkingSubStep('2c');
    setSubStep('3a');
    setActiveProject(null, null);

    if (authMode === 'account' && session) {
      const creationPromise = persistProjectState({
        forceCreate: true,
        allowEmptyRawText: true,
        name: `Untitled Draft ${new Date().toLocaleString()}`,
        taskPrompt: '',
        rawText: '',
        chunks: [],
        results: null,
        processingMode: 'sequential',
      });

      pendingProjectCreationRef.current = creationPromise;

      try {
        await creationPromise;
      } finally {
        if (pendingProjectCreationRef.current === creationPromise) {
          pendingProjectCreationRef.current = null;
        }
      }
    }

    showToast('Started a new project');
  };

  const handleChunksPersist = useCallback((nextChunks: Chunk[]) => {
    setChunks(nextChunks);
    setResults([]);
    void persistProjectState({
      chunks: nextChunks,
      results: null,
    });
  }, [persistProjectState]);

  const handleResultsPersist = useCallback((nextResults: ProcessingResult[]) => {
    setResults(nextResults);
    void persistProjectState({
      results: nextResults,
    });
  }, [persistProjectState]);

  const commitProjectName = useCallback(async () => {
    const trimmedName = projectNameInput.trim();
    const nextName = trimmedName || buildAutoProjectName(rawText);

    setProjectNameInput(nextName);
    setActiveProject(activeProjectIdRef.current, nextName);

    await persistProjectState({
      name: nextName,
      allowEmptyRawText: true,
    });
  }, [buildAutoProjectName, persistProjectState, projectNameInput, rawText, setActiveProject]);

  const handleTopBack = useCallback(() => {
    if (currentStep === 1) {
      return;
    }

    prevStep();
  }, [currentStep, prevStep]);

  const handleTopNext = useCallback(() => {
    if (currentStep === 1) {
      if (!rawText.trim()) {
        showToast('Please paste some text first');
        return;
      }

      if (countWords(rawText) < 100) {
        showToast('Text is too short for chunking');
        return;
      }

      nextStep();
      return;
    }

    if (currentStep === 2) {
      if (chunks.length === 0) {
        showToast('No chunks available');
        return;
      }

      nextStep();
      return;
    }

    if (currentStep === 3) {
      goToProcessing();
    }
  }, [chunks.length, currentStep, goToProcessing, nextStep, rawText, showToast]);

  const nextButtonLabel = currentStep === 3 ? 'Process' : 'Next';
  const disableBack = currentStep === 1 || isChunking;
  const disableNext = currentStep === 4 || isChunking;
  const disableProcessingBack = currentStep === 4 && results.some((result) => result.status === 'processing');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere with sequential copy shortcuts when on step 3b
      if (currentStep === 3 && subStep === '3b') {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!disableNext) {
          handleTopNext();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault();
        if (!disableBack && !disableProcessingBack) {
          handleTopBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [
    currentStep,
    disableBack,
    disableNext,
    disableProcessingBack,
    handleTopBack,
    handleTopNext,
    subStep,
  ]);

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
            API chunking in step 2a requires an Anthropic key, but step 2b prompt chunking and step 2c paragraph chunking still work without one.
          </div>
          <Button size="small" onClick={() => setShowSettings(true)}>
            Configure
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:sticky lg:top-8 lg:w-80 lg:flex-none">
          <ProjectHistory
            authMode={authMode}
            projects={projects}
            loading={projectsLoading}
            activeProjectId={activeInputProjectId}
            onLoadProject={handleLoadProject}
            onNewProject={handleNewProject}
            onDeleteProject={handleDeleteProject}
            className="lg:max-h-[calc(100vh-8rem)]"
          />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 rounded-xl border border-surface-light bg-surface px-4 py-3">
            <label className="block text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
              Project Name
            </label>
            <input
              type="text"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={() => {
                void commitProjectName();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setProjectNameInput(activeInputProjectName ?? buildAutoProjectName(rawText));
                  e.currentTarget.blur();
                }
              }}
              placeholder={buildAutoProjectName(rawText)}
              className="mt-2 w-full rounded-lg border border-surface-lighter bg-surface-light px-3 py-2 text-lg font-semibold text-gray-100 focus:outline-none"
            />
          </div>

          <StepIndicator
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
            chunkingSubStep={currentStep === 2 ? chunkingSubStep : null}
            onChunkingSubStepClick={setChunkingSubStep}
            subStep={currentStep === 3 ? subStep : null}
            onSubStepClick={setSubStep}
          />

          <div className="sticky top-4 z-10 mb-6 flex items-center justify-between rounded-xl border border-surface-light bg-surface/95 px-4 py-3 backdrop-blur">
            <Button
              variant="secondary"
              size="small"
              onClick={handleTopBack}
              disabled={disableBack || disableProcessingBack}
            >
              &larr; Back
            </Button>
            <Button
              size="small"
              onClick={handleTopNext}
              disabled={disableNext}
            >
              {nextButtonLabel} &rarr;
            </Button>
          </div>

          {/* Step 1: Input Text (was Step 2) */}
          {currentStep === 1 && (
            <Step2TextInput
              rawText={rawText}
              setRawText={handleRawTextChange}
              onNext={nextStep}
              showToast={showToast}
              onAutoSave={handleAutoSave}
            />
          )}

          {/* Step 2: Chunk & Adjust (was Step 3) */}
          {currentStep === 2 && (
            <Step3Chunking
              rawText={rawText}
              chunks={chunks}
              setChunks={handleChunksPersist}
              isChunking={isChunking}
              setIsChunking={setIsChunking}
              chunkingSubStep={chunkingSubStep}
              setChunkingSubStep={setChunkingSubStep}
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
              onResultsPersist={handleResultsPersist}
              onBack={prevStep}
              showToast={showToast}
            />
          )}
        </div>
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
