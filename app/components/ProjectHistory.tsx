'use client';

import { useState, useEffect, useCallback, type MutableRefObject } from 'react';
import { FolderOpen, Trash2, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { Chunk, ProcessingResult } from '@/lib/schemas/task';

interface ProjectSummary {
  id: string;
  name: string;
  taskPrompt: string;
  processingMode: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectFull extends ProjectSummary {
  rawText: string;
  chunks: Chunk[];
  results: ProcessingResult[] | null;
}

interface ProjectHistoryProps {
  onLoad: (project: ProjectFull) => void;
  showToast: (message: string, error?: unknown) => void;
  currentProjectId: string | null;
  onRefreshRef: MutableRefObject<(() => void) | null>;
}

export default function ProjectHistory({ onLoad, showToast, currentProjectId, onRefreshRef }: ProjectHistoryProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch {
      // Silently fail — user might not be authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Expose refresh function to parent
  useEffect(() => {
    onRefreshRef.current = fetchProjects;
    return () => { onRefreshRef.current = null; };
  }, [fetchProjects, onRefreshRef]);

  const loadProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to load project');
      const data = await res.json();
      onLoad(data.project);
      showToast(`Loaded: ${data.project.name}`);
    } catch (err) {
      showToast('Failed to load project', err);
    }
  };

  const deleteProject = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showToast(`Deleted: ${name}`);
    } catch (err) {
      showToast('Failed to delete project', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen size={18} className="text-accent" />
          <h3 className="text-base font-semibold">Projects</h3>
        </div>
        <div className="text-sm text-gray-500 text-center py-4">Loading...</div>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen size={18} className="text-accent" />
          <h3 className="text-base font-semibold">Projects</h3>
        </div>
        <div className="text-sm text-gray-500 text-center py-3">
          No projects yet. Start typing to auto-create one.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen size={18} className="text-accent" />
        <h3 className="text-base font-semibold">Projects ({projects.length})</h3>
      </div>

      <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
        {projects.map((project) => {
          const isActive = project.id === currentProjectId;

          return (
            <div
              key={project.id}
              className={`p-3 rounded-md flex justify-between items-center group transition-colors ${
                isActive
                  ? 'bg-accent/10 border border-accent/30'
                  : 'bg-surface-light hover:bg-surface-light/80'
              }`}
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-medium truncate ${isActive ? 'text-accent' : ''}`}>
                    {project.name}
                  </div>
                  {isActive && (
                    <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      active
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={10} />
                  {new Date(project.updatedAt).toLocaleDateString()}{' '}
                  {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex gap-1">
                {!isActive && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => loadProject(project.id)}
                  >
                    Load
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => deleteProject(project.id, project.name)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
