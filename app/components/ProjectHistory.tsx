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
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen size={14} className="text-accent" />
        <h3 className="text-sm font-semibold">Projects ({projects.length})</h3>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
        {projects.map((project) => {
          const isActive = project.id === currentProjectId;

          return (
            <div
              key={project.id}
              className={`px-2.5 py-2 rounded-md flex justify-between items-center group transition-colors cursor-pointer ${
                isActive
                  ? 'bg-accent/10 border border-accent/30'
                  : 'bg-surface-light hover:bg-surface-light/80'
              }`}
              onClick={() => !isActive && loadProject(project.id)}
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className={`text-xs font-medium truncate ${isActive ? 'text-accent' : ''}`}>
                  {project.name}
                </div>
                <div className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                  <Clock size={8} />
                  {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="danger"
                size="small"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => { e.stopPropagation(); deleteProject(project.id, project.name); }}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
